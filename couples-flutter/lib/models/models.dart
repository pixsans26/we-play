class Task {
  final String id;
  final String title;
  final String description;
  final String emoji;
  final int timerSeconds;
  final int level;
  final String category;

  Task({
    required this.id,
    required this.title,
    required this.description,
    this.emoji = '💕',
    this.timerSeconds = 40,
    required this.level,
    required this.category,
  });

  factory Task.fromJson(Map<String, dynamic> j) => Task(
        id: j['id']?.toString() ?? '',
        title: j['title'] ?? '',
        description: j['description'] ?? '',
        emoji: j['emoji'] ?? '💕',
        timerSeconds: j['timerSeconds'] ?? 40,
        level: j['level'] ?? 1,
        category: j['category'] ?? 'romantic',
      );
}

class ImageTask {
  final String id;
  final String imageSource;
  final String title;
  final int level;

  ImageTask({
    required this.id,
    required this.imageSource,
    required this.title,
    required this.level,
  });

  factory ImageTask.fromJson(Map<String, dynamic> j) => ImageTask(
        id: j['id']?.toString() ?? '',
        imageSource: j['imageSource'] ?? '',
        title: j['title'] ?? '',
        level: j['level'] ?? 1,
      );
}

class UserProgress {
  final int id;
  final String userUid;
  final int scratchCount;
  final int completedCount;
  final int currentLevel;

  UserProgress({
    required this.id,
    required this.userUid,
    required this.scratchCount,
    required this.completedCount,
    required this.currentLevel,
  });

  factory UserProgress.fromJson(Map<String, dynamic> j) => UserProgress(
        id: j['id'] ?? 0,
        userUid: j['userUid'] ?? '',
        scratchCount: j['scratchCount'] ?? 0,
        completedCount: j['completedCount'] ?? 0,
        currentLevel: j['currentLevel'] ?? 1,
      );
}

class HistoryEntry {
  final int id;
  final String userUid;
  final String taskId;
  final String taskType;
  final String? category;
  final DateTime scratchedAt;
  final bool completed;
  final bool skipped;
  final int? timeTaken;
  final String? performerUid;

  HistoryEntry({
    required this.id,
    required this.userUid,
    required this.taskId,
    required this.taskType,
    this.category,
    required this.scratchedAt,
    required this.completed,
    required this.skipped,
    this.timeTaken,
    this.performerUid,
  });

  factory HistoryEntry.fromJson(Map<String, dynamic> j) => HistoryEntry(
        id: j['id'] ?? 0,
        userUid: j['userUid'] ?? '',
        taskId: j['taskId']?.toString() ?? '',
        taskType: j['taskType'] ?? 'text',
        category: j['category'],
        scratchedAt: j['scratchedAt'] != null
            ? DateTime.tryParse(j['scratchedAt'].toString()) ?? DateTime.now()
            : DateTime.now(),
        completed: j['completed'] ?? false,
        skipped: j['skipped'] ?? false,
        timeTaken: j['timeTaken'],
        performerUid: j['performerUid'],
      );
}

const Map<int, Map<String, String>> kLevelBadges = {
  1: {'emoji': '🌱', 'label': 'New Couple'},
  2: {'emoji': '💞', 'label': 'Getting Closer'},
  3: {'emoji': '🔥', 'label': 'Heating Up'},
  4: {'emoji': '💜', 'label': 'Deeply Connected'},
  5: {'emoji': '👑', 'label': 'Soulmates'},
};
