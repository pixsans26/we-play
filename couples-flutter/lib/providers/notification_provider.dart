import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppNotification {
  final String id;
  final String title;
  final String message;
  final String time;
  final String icon;
  final String iconColor;
  final String bgColor;
  bool isNew;

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.time,
    required this.icon,
    required this.iconColor,
    required this.bgColor,
    required this.isNew,
  });

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id'] ?? '',
        title: j['title'] ?? '',
        message: j['message'] ?? '',
        time: j['time'] ?? '',
        icon: j['icon'] ?? '',
        iconColor: j['iconColor'] ?? '#3b82f6',
        bgColor: j['bgColor'] ?? 'rgba(59,130,246,0.15)',
        isNew: j['isNew'] ?? false,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'message': message,
        'time': time,
        'icon': icon,
        'iconColor': iconColor,
        'bgColor': bgColor,
        'isNew': isNew,
      };
}

class NotificationProvider extends ChangeNotifier {
  List<AppNotification> _notifications = [];
  bool _hasUnread = true;

  List<AppNotification> get notifications => _notifications;
  bool get hasUnread => _hasUnread;

  NotificationProvider() {
    _load();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString('notifications');
      if (saved != null) {
        final list = jsonDecode(saved) as List;
        _notifications = list.map((item) => AppNotification.fromJson(item)).toList();
        _hasUnread = prefs.getBool('hasUnread') ?? false;
      } else {
        // Initial Mock notifications
        _notifications = [
          AppNotification(
            id: "1",
            title: "App Update Available 🚀",
            message: "Version 1.2 is here with new games and bug fixes. Tap to learn more.",
            time: "1 hour ago",
            icon: "download",
            iconColor: "#3b82f6",
            bgColor: "rgba(59,130,246,0.15)",
            isNew: true,
          ),
          AppNotification(
            id: "2",
            title: "Daily Cycle Update 🌸",
            message: "She is in her Follicular phase. Energy levels are rising! Read today's insight.",
            time: "4 hours ago",
            icon: "flower",
            iconColor: "#a855f7",
            bgColor: "rgba(168,85,247,0.15)",
            isNew: true,
          ),
          AppNotification(
            id: "3",
            title: "It's your turn! 🎲",
            message: "Your partner just played a round of Fate Wheel. Your turn next!",
            time: "Yesterday",
            icon: "gamepad",
            iconColor: "#f59e0b",
            bgColor: "rgba(245,158,11,0.15)",
            isNew: false,
          ),
        ];
        _hasUnread = true;
      }
    } catch (_) {}
    notifyListeners();
  }

  Future<void> _save() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('notifications', jsonEncode(_notifications.map((n) => n.toJson()).toList()));
      await prefs.setBool('hasUnread', _hasUnread);
    } catch (_) {}
  }

  void addNotification(AppNotification notif) {
    _notifications.insert(0, notif);
    _hasUnread = true;
    _save();
    notifyListeners();
  }

  void removeNotification(String id) {
    _notifications.removeWhere((n) => n.id == id);
    _save();
    notifyListeners();
  }

  void clearAll() {
    _notifications.clear();
    _hasUnread = false;
    _save();
    notifyListeners();
  }

  void markAllRead() {
    _hasUnread = false;
    for (var n in _notifications) {
      n.isNew = false;
    }
    _save();
    notifyListeners();
  }
}
