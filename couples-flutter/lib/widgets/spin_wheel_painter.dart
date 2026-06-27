import 'dart:math';
import 'package:flutter/material.dart';

class SpinWheelPainter extends CustomPainter {
  final List<Map<String, dynamic>> segments;
  final double rotationAngle;

  static const List<Color> _colors = [
    Color(0xFFDB2777), // pink
    Color(0xFF9333EA), // purple
    Color(0xFFEC4899), // pink-500
    Color(0xFF7C3AED), // violet
    Color(0xFFF472B6), // pink-400
    Color(0xFF8B5CF6), // violet-500
    Color(0xFFE879F9), // fuchsia
    Color(0xFF6D28D9), // violet-700
  ];

  SpinWheelPainter({required this.segments, required this.rotationAngle});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 12;
    final count = segments.length;
    if (count == 0) return;

    final sweepAngle = 2 * pi / count;

    // Draw rim
    final rimPaint = Paint()
      ..color = const Color(0xFFFFFFFF)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14;
    canvas.drawCircle(center, radius + 7, rimPaint);

    // Draw outer glow
    final glowPaint = Paint()
      ..color = const Color(0x44DB2777)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;
    canvas.drawCircle(center, radius + 14, glowPaint);

    for (int i = 0; i < count; i++) {
      final startAngle = rotationAngle + i * sweepAngle - pi / 2;
      final color = _colors[i % _colors.length];

      // Wedge fill
      final fillPaint = Paint()..color = color;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        true,
        fillPaint,
      );

      // Wedge border
      final borderPaint = Paint()
        ..color = Colors.white.withOpacity(0.3)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.5;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        sweepAngle,
        true,
        borderPaint,
      );

      // Draw text label
      final midAngle = startAngle + sweepAngle / 2;
      final textRadius = radius * 0.65;
      final textCenter = Offset(
        center.dx + textRadius * cos(midAngle),
        center.dy + textRadius * sin(midAngle),
      );

      final label = segments[i]['label']?.toString() ?? '';
      final truncated = label.length > 12 ? '${label.substring(0, 12)}…' : label;

      final tp = TextPainter(
        text: TextSpan(
          text: truncated,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.w700,
            shadows: [Shadow(color: Colors.black45, blurRadius: 2, offset: Offset(0, 1))],
          ),
        ),
        textDirection: TextDirection.ltr,
        textAlign: TextAlign.center,
      )..layout(maxWidth: textRadius * 1.2);

      canvas.save();
      canvas.translate(textCenter.dx, textCenter.dy);
      canvas.rotate(midAngle + pi / 2);
      tp.paint(canvas, Offset(-tp.width / 2, -tp.height / 2));
      canvas.restore();
    }

    // Center circle
    final centerGrad = RadialGradient(
      colors: [const Color(0xFFDB2777), const Color(0xFF9333EA)],
    );
    final centerPaint = Paint()
      ..shader = centerGrad.createShader(Rect.fromCircle(center: center, radius: 28));
    canvas.drawCircle(center, 28, centerPaint);

    final centerBorderPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    canvas.drawCircle(center, 28, centerBorderPaint);

    // Pointer triangle
    final pointerPaint = Paint()
      ..color = const Color(0xFFFFFFFF)
      ..style = PaintingStyle.fill;
    final pointerPath = Path()
      ..moveTo(center.dx - 12, center.dy - radius - 18)
      ..lineTo(center.dx + 12, center.dy - radius - 18)
      ..lineTo(center.dx, center.dy - radius - 2)
      ..close();
    canvas.drawPath(pointerPath, pointerPaint);

    // Pointer shadow
    final pointerShadowPaint = Paint()
      ..color = const Color(0x44000000)
      ..style = PaintingStyle.fill;
    final shadowPath = Path()
      ..moveTo(center.dx - 12, center.dy - radius - 20)
      ..lineTo(center.dx + 12, center.dy - radius - 20)
      ..lineTo(center.dx, center.dy - radius - 4)
      ..close();
    canvas.drawPath(shadowPath, pointerShadowPaint);
  }

  @override
  bool shouldRepaint(SpinWheelPainter old) => old.rotationAngle != rotationAngle;
}
