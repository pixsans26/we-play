import 'package:audioplayers/audioplayers.dart';

class SoundService {
  static final AudioPlayer _player = AudioPlayer();

  static Future<void> playScratch() async {
    try {
      await _player.play(AssetSource('sounds/scratch.wav'));
    } catch (_) {}
  }

  static Future<void> playAlarm() async {
    try {
      await _player.play(AssetSource('sounds/alarm.wav'));
    } catch (_) {}
  }

  static Future<void> playLevelUp() async {
    try {
      await _player.play(AssetSource('sounds/level-up.wav'));
    } catch (_) {}
  }
}
