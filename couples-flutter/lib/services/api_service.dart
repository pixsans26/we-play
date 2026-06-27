import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

class ApiService {
  static String? _sessionToken;

  static void setToken(String? token) {
    _sessionToken = token;
  }

  static Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_sessionToken != null) 'Authorization': 'Bearer $_sessionToken',
      };

  static Future<http.Response> get(String path) async {
    final uri = Uri.parse('$kApiBaseUrl$path?_t=${DateTime.now().millisecondsSinceEpoch}');
    return http.get(uri, headers: _headers);
  }

  static Future<http.Response> post(String path, Map<String, dynamic> body) async {
    final uri = Uri.parse('$kApiBaseUrl$path');
    return http.post(uri, headers: _headers, body: jsonEncode(body));
  }

  static Future<http.Response> patch(String path, [Map<String, dynamic>? body]) async {
    final uri = Uri.parse('$kApiBaseUrl$path');
    return http.patch(uri, headers: _headers, body: body != null ? jsonEncode(body) : null);
  }

  static Future<Map<String, dynamic>?> fetchTasks(String type) async {
    try {
      final res = await get('/api/tasks/$type');
      if (res.statusCode == 200) return {'data': jsonDecode(res.body)};
    } catch (_) {}
    return null;
  }

  static Future<Map<String, dynamic>?> fetchCoupleProfile(String uid) async {
    try {
      final res = await get('/api/couple/$uid');
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return null;
  }

  static Future<Map<String, dynamic>?> fetchProgress(String uid) async {
    try {
      final res = await get('/api/progress/$uid');
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return null;
  }

  static Future<bool> incrementCompleted(String uid) async {
    try {
      final res = await patch('/api/progress/$uid/increment-completed');
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<List<dynamic>> fetchHistory(String userUid) async {
    try {
      final res = await get('/api/history/$userUid');
      if (res.statusCode == 200) return jsonDecode(res.body);
    } catch (_) {}
    return [];
  }

  static Future<bool> logScratch({
    required String userUid,
    required String taskId,
    required String taskType,
    required bool completed,
    required bool skipped,
    String? performerUid,
  }) async {
    try {
      final res = await post('/api/history', {
        'userUid': userUid,
        'taskId': taskId,
        'taskType': taskType,
        'completed': completed,
        'skipped': skipped,
        if (performerUid != null) 'performerUid': performerUid,
      });
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  static Future<Map<String, dynamic>?> joinCouple({
    required String uid,
    required String inviteCode,
    required String sessionToken,
  }) async {
    try {
      final res = await post('/api/couple/invite/join', {
        'uid': uid,
        'inviteCode': inviteCode,
      });
      if (res.statusCode == 200) return jsonDecode(res.body);
      final err = jsonDecode(res.body);
      return {'error': err['error'] ?? 'Failed to join'};
    } catch (_) {
      return {'error': 'Network error'};
    }
  }
}
