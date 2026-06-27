import 'package:audioplayers/audioplayers.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SoundService {
  static final AudioPlayer _player = AudioPlayer();
  static bool soundEnabled = true;

  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      soundEnabled = prefs.getBool('sound_enabled') ?? true;
    } catch (_) {}
  }

  static Future<void> toggleSound(bool enabled) async {
    soundEnabled = enabled;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool('sound_enabled', enabled);
    } catch (_) {}
  }

  static Future<void> playScratch() async {
    if (!soundEnabled) return;
    try {
      await _player.play(AssetSource('sounds/scratch.wav'));
    } catch (_) {}
  }

  static Future<void> playAlarm() async {
    if (!soundEnabled) return;
    try {
      await _player.play(AssetSource('sounds/alarm.wav'));
    } catch (_) {}
  }

  static Future<void> playLevelUp() async {
    if (!soundEnabled) return;
    try {
      await _player.play(AssetSource('sounds/level-up.wav'));
    } catch (_) {}
  }
}
