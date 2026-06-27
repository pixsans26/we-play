import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class GameProvider extends ChangeNotifier {
  String _currentTurn = 'A'; // 'A' or 'B'
  int _streak = 0;
  String? _lastPlayedDate;
  int _spinCount = 0;

  List<Task> _textTasks = [];
  List<ImageTask> _imageTasks = [];
  List<dynamic> _spinTasks = [];
  Map<String, dynamic> _lotteryData = {'col1': [], 'col2': [], 'col3': []};
  bool _isDataLoaded = false;

  // Current game session state
  Task? _currentTask;
  ImageTask? _currentImageTask;
  bool _isScratched = false;
  String? _performingPartnerName;
  String? _mode;

  // Getters
  String get currentTurn => _currentTurn;
  int get streak => _streak;
  int get spinCount => _spinCount;
  List<Task> get textTasks => _textTasks;
  List<ImageTask> get imageTasks => _imageTasks;
  List<dynamic> get spinTasks => _spinTasks;
  Map<String, dynamic> get lotteryData => _lotteryData;
  bool get isDataLoaded => _isDataLoaded;
  Task? get currentTask => _currentTask;
  ImageTask? get currentImageTask => _currentImageTask;
  bool get isScratched => _isScratched;
  String? get performingPartnerName => _performingPartnerName;
  String? get mode => _mode;

  GameProvider() {
    _load();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _currentTurn = prefs.getString('currentTurn') ?? 'A';
      _streak = prefs.getInt('streak') ?? 0;
      _lastPlayedDate = prefs.getString('lastPlayedDate');
      _spinCount = prefs.getInt('spinCount') ?? 0;

      final ttJson = prefs.getString('textTasks');
      if (ttJson != null) {
        final list = jsonDecode(ttJson) as List;
        _textTasks = list.map((j) => Task.fromJson(j)).toList();
      }
      final itJson = prefs.getString('imageTasks');
      if (itJson != null) {
        final list = jsonDecode(itJson) as List;
        _imageTasks = list.map((j) => ImageTask.fromJson(j)).toList();
      }
      final ldJson = prefs.getString('lotteryData');
      if (ldJson != null) _lotteryData = jsonDecode(ldJson);
      _isDataLoaded = _textTasks.isNotEmpty || _imageTasks.isNotEmpty;
    } catch (_) {}
    notifyListeners();
  }

  Future<void> fetchData() async {
    try {
      final results = await Future.wait([
        ApiService.get('/api/tasks/text'),
        ApiService.get('/api/tasks/image'),
        ApiService.get('/api/tasks/spin'),
        ApiService.get('/api/tasks/lottery'),
      ]);

      final txt = results[0].statusCode == 200 ? jsonDecode(results[0].body) as List : [];
      final img = results[1].statusCode == 200 ? jsonDecode(results[1].body) as List : [];
      final spin = results[2].statusCode == 200 ? jsonDecode(results[2].body) as List : [];
      final lot = results[3].statusCode == 200 ? jsonDecode(results[3].body) as List : [];

      _textTasks = txt.map((j) => Task.fromJson(j)).toList();
      _imageTasks = img.map((j) => ImageTask.fromJson(j)).toList();
      _spinTasks = spin;

      _lotteryData = {
        'col1': lot.where((i) => i['columnType'] == 'action' && i['active'] == true).map((i) => {'label': i['label'], 'type': i['actionType'], 'level': i['level']}).toList(),
        'col2': lot.where((i) => i['columnType'] == 'spot' && i['active'] == true).map((i) => {'label': i['label'], 'level': i['level']}).toList(),
        'col3': lot.where((i) => i['columnType'] == 'extra' && i['active'] == true).map((i) => {'label': i['label'], 'type': i['actionType'], 'level': i['level']}).toList(),
      };
      _isDataLoaded = true;

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('textTasks', jsonEncode(txt));
      await prefs.setString('imageTasks', jsonEncode(img));
      await prefs.setString('lotteryData', jsonEncode(_lotteryData));
      notifyListeners();
    } catch (e) {
      throw Exception('Failed to fetch game data: $e');
    }
  }

  void setMode(String m) {
    _mode = m;
    notifyListeners();
  }

  void setCurrentTask(Task? task) {
    _currentTask = task;
    notifyListeners();
  }

  void setCurrentImageTask(ImageTask? task) {
    _currentImageTask = task;
    notifyListeners();
  }

  void setIsScratched(bool v) {
    _isScratched = v;
    notifyListeners();
  }

  void setPerformingPartnerName(String? name) {
    _performingPartnerName = name;
    notifyListeners();
  }

  void switchTurn() {
    _currentTurn = _currentTurn == 'A' ? 'B' : 'A';
    _savePrefs();
    notifyListeners();
  }

  void updateStreak() {
    final today = DateTime.now().toIso8601String().split('T')[0];
    if (_lastPlayedDate == today) return;
    final yesterday = DateTime.now().subtract(const Duration(days: 1)).toIso8601String().split('T')[0];
    if (_lastPlayedDate == yesterday) {
      _streak += 1;
    } else {
      _streak = 1;
    }
    _lastPlayedDate = today;
    _savePrefs();
    notifyListeners();
  }

  void incrementSpinCount() {
    _spinCount += 1;
    _savePrefs();
    notifyListeners();
  }

  void resetSession() {
    _currentTask = null;
    _currentImageTask = null;
    _isScratched = false;
    _performingPartnerName = null;
    notifyListeners();
  }

  // Get next unseen task for a user
  Task? getNextTextTask(String userUid, int level) {
    final candidates = _textTasks.where((t) => t.level <= level).toList();
    if (candidates.isEmpty) return null;
    candidates.shuffle();
    return candidates.first;
  }

  ImageTask? getNextImageTask(String userUid, int level) {
    final candidates = _imageTasks.where((t) => t.level <= level).toList();
    if (candidates.isEmpty) return null;
    candidates.shuffle();
    return candidates.first;
  }

  Future<void> _savePrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('currentTurn', _currentTurn);
      await prefs.setInt('streak', _streak);
      if (_lastPlayedDate != null) await prefs.setString('lastPlayedDate', _lastPlayedDate!);
      await prefs.setInt('spinCount', _spinCount);
    } catch (_) {}
  }
}
