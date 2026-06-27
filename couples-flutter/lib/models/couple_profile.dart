class CoupleProfile {
  final int id;
  final String partnerAUid;
  final String? partnerBUid;
  final String partnerAName;
  final String? partnerBName;
  final String? partnerAAvatar;
  final String? partnerBAvatar;
  final int? partnerAAge;
  final int? partnerBAge;
  final String? partnerAGender;
  final String? partnerBGender;
  final String? whatALikes;
  final String? whatBLikes;
  final String? status;
  final String? inviteCode;

  CoupleProfile({
    required this.id,
    required this.partnerAUid,
    this.partnerBUid,
    required this.partnerAName,
    this.partnerBName,
    this.partnerAAvatar,
    this.partnerBAvatar,
    this.partnerAAge,
    this.partnerBAge,
    this.partnerAGender,
    this.partnerBGender,
    this.whatALikes,
    this.whatBLikes,
    this.status,
    this.inviteCode,
  });

  bool get isLinked => status != 'pending' && partnerBUid != null && partnerBUid!.isNotEmpty;

  factory CoupleProfile.fromJson(Map<String, dynamic> j) => CoupleProfile(
        id: j['id'] ?? 0,
        partnerAUid: j['partnerAUid'] ?? '',
        partnerBUid: j['partnerBUid'],
        partnerAName: j['partnerAName'] ?? '',
        partnerBName: j['partnerBName'],
        partnerAAvatar: j['partnerAAvatar'],
        partnerBAvatar: j['partnerBAvatar'],
        partnerAAge: j['partnerAAge'],
        partnerBAge: j['partnerBAge'],
        partnerAGender: j['partnerAGender'],
        partnerBGender: j['partnerBGender'],
        whatALikes: j['whatALikes'],
        whatBLikes: j['whatBLikes'],
        status: j['status'],
        inviteCode: j['inviteCode'],
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'partnerAUid': partnerAUid,
        'partnerBUid': partnerBUid,
        'partnerAName': partnerAName,
        'partnerBName': partnerBName,
        'partnerAAvatar': partnerAAvatar,
        'partnerBAvatar': partnerBAvatar,
        'partnerAAge': partnerAAge,
        'partnerBAge': partnerBAge,
        'partnerAGender': partnerAGender,
        'partnerBGender': partnerBGender,
        'whatALikes': whatALikes,
        'whatBLikes': whatBLikes,
        'status': status,
        'inviteCode': inviteCode,
      };
}
