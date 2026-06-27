import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/couple_profile.dart';

class AuthProvider extends ChangeNotifier {
  // Simple user model (uid + email) — avoids Firebase dependency if not configured
  String? _uid;
  String? _email;
  String? _displayName;
  bool _isPartnerA = true;
  CoupleProfile? _coupleProfile;
  String? _sessionToken;
  bool _isLoading = true;

  String? get uid => _uid;
  String? get email => _email;
  String? get displayName => _displayName;
  bool get isPartnerA => _isPartnerA;
  CoupleProfile? get coupleProfile => _coupleProfile;
  String? get sessionToken => _sessionToken;
  bool get isLoading => _isLoading;
  bool get isLoggedIn => _uid != null;

  AuthProvider() {
    _load();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _uid = prefs.getString('uid');
      _email = prefs.getString('email');
      _displayName = prefs.getString('displayName');
      _isPartnerA = prefs.getBool('isPartnerA') ?? true;
      _sessionToken = prefs.getString('sessionToken');
      final cpJson = prefs.getString('coupleProfile');
      if (cpJson != null) {
        _coupleProfile = CoupleProfile.fromJson(jsonDecode(cpJson));
      }
    } catch (_) {}
    _isLoading = false;
    notifyListeners();
  }

  Future<void> setUser({
    required String uid,
    required String email,
    String? displayName,
    String? sessionToken,
  }) async {
    _uid = uid;
    _email = email;
    _displayName = displayName;
    _sessionToken = sessionToken;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('uid', uid);
    await prefs.setString('email', email);
    if (displayName != null) await prefs.setString('displayName', displayName);
    if (sessionToken != null) await prefs.setString('sessionToken', sessionToken);
    notifyListeners();
  }

  Future<void> setCoupleProfile(CoupleProfile? profile) async {
    _coupleProfile = profile;
    final prefs = await SharedPreferences.getInstance();
    if (profile != null) {
      await prefs.setString('coupleProfile', jsonEncode(profile.toJson()));
    } else {
      await prefs.remove('coupleProfile');
    }
    notifyListeners();
  }

  Future<void> setIsPartnerA(bool value) async {
    _isPartnerA = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('isPartnerA', value);
    notifyListeners();
  }

  Future<void> logout() async {
    _uid = null;
    _email = null;
    _displayName = null;
    _sessionToken = null;
    _coupleProfile = null;
    _isPartnerA = true;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }
}
