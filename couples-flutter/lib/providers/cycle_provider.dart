import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class CycleTracking {
  final int? coupleId;
  final String? femaleUid;
  final int averageCycleLength;
  final int averagePeriodLength;
  final String? lastPeriodStart;
  final String? lastPeriodEnd;
  final bool isLocked;

  CycleTracking({
    this.coupleId,
    this.femaleUid,
    required this.averageCycleLength,
    required this.averagePeriodLength,
    this.lastPeriodStart,
    this.lastPeriodEnd,
    required this.isLocked,
  });

  factory CycleTracking.fromJson(Map<String, dynamic> j) => CycleTracking(
        coupleId: j['coupleId'],
        femaleUid: j['femaleUid'],
        averageCycleLength: j['averageCycleLength'] ?? 28,
        averagePeriodLength: j['averagePeriodLength'] ?? 5,
        lastPeriodStart: j['lastPeriodStart'],
        lastPeriodEnd: j['lastPeriodEnd'],
        isLocked: j['isLocked'] ?? false,
      );

  Map<String, dynamic> toJson() => {
        if (coupleId != null) 'coupleId': coupleId,
        if (femaleUid != null) 'femaleUid': femaleUid,
        'averageCycleLength': averageCycleLength,
        'averagePeriodLength': averagePeriodLength,
        if (lastPeriodStart != null) 'lastPeriodStart': lastPeriodStart,
        if (lastPeriodEnd != null) 'lastPeriodEnd': lastPeriodEnd,
        'isLocked': isLocked,
      };
}

class CycleProvider extends ChangeNotifier {
  CycleTracking? _cycleConfig;
  bool _isLoading = false;
  String? _error;

  CycleTracking? get cycleConfig => _cycleConfig;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchCycleConfig(String identifier, String sessionToken) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await ApiService.get('/api/cycle/$identifier');
      if (res.statusCode == 200) {
        _cycleConfig = CycleTracking.fromJson(jsonDecode(res.body));
      } else if (res.statusCode == 404) {
        _cycleConfig = null;
      } else {
        _error = "Failed to fetch cycle configuration";
      }
    } catch (err) {
      _error = err.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateCycleConfig(String identifier, Map<String, dynamic> updates, String sessionToken) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Put to /api/cycle/:id
      final res = await ApiService.post('/api/cycle/$identifier', updates); // Post or Put wrapper
      if (res.statusCode == 200 || res.statusCode == 201) {
        _cycleConfig = CycleTracking.fromJson(jsonDecode(res.body));
      } else {
        // Fallback to PATCH/PUT via custom post request (mock custom REST client)
        final rawRes = await ApiService.post('/api/cycle/$identifier', updates);
        if (rawRes.statusCode == 200 || rawRes.statusCode == 201) {
          _cycleConfig = CycleTracking.fromJson(jsonDecode(rawRes.body));
        } else {
          _error = "Failed to update cycle configuration";
        }
      }
    } catch (err) {
      _error = err.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
