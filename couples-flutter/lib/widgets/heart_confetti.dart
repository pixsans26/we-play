import 'dart:math';
import 'package:flutter/material.dart';

class HeartConfetti extends StatefulWidget {
  final VoidCallback? onComplete;

  const HeartConfetti({super.key, this.onComplete});

  @override
  State<HeartConfetti> createState() => _HeartConfettiState();
}

class _HeartConfettiState extends State<HeartConfetti>
    with TickerProviderStateMixin {
  late final List<_HeartParticle> _particles;
  late final AnimationController _controller;
  final Random _rng = Random();

  @override
  void initState() {
    super.initState();
    _particles = List.generate(30, (_) => _HeartParticle(_rng));
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    )..forward().whenComplete(() {
        widget.onComplete?.call();
      });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (_, __) {
          return CustomPaint(
            painter: _HeartPainter(_particles, _controller.value),
            size: Size.infinite,
          );
        },
      ),
    );
  }
}

class _HeartParticle {
  final double x;
  final double startY;
  final double speed;
  final double size;
  final Color color;
  final double wobble;
  final double wobbleSpeed;

  _HeartParticle(Random rng)
      : x = rng.nextDouble(),
        startY = rng.nextDouble() * 0.4,
        speed = 0.3 + rng.nextDouble() * 0.7,
        size = 10 + rng.nextDouble() * 20,
        color = [
          const Color(0xFFFF2D6B),
          const Color(0xFFFF6B9D),
          const Color(0xFFFFD700),
          const Color(0xFF9333EA),
          const Color(0xFFFF8A00),
        ][rng.nextInt(5)],
        wobble = rng.nextDouble() * 2 * 3.14159,
        wobbleSpeed = 2 + rng.nextDouble() * 4;
}

class _HeartPainter extends CustomPainter {
  final List<_HeartParticle> particles;
  final double t;

  _HeartPainter(this.particles, this.t);

  @override
  void paint(Canvas canvas, Size size) {
    for (final p in particles) {
      final progress = ((t * p.speed) % 1.0);
      final x = p.x * size.width + sin(p.wobble + t * p.wobbleSpeed * 2) * 30;
      final y = p.startY * size.height + progress * size.height * 1.5;
      final opacity = (1.0 - progress).clamp(0.0, 1.0);

      _drawHeart(canvas, Offset(x, y), p.size, p.color.withOpacity(opacity));
    }
  }

  void _drawHeart(Canvas canvas, Offset center, double size, Color color) {
    final paint = Paint()..color = color;
    final path = Path();
    final s = size / 2;
    // Simple heart shape
    path.moveTo(center.dx, center.dy + s * 0.5);
    path.cubicTo(
      center.dx - s * 1.2, center.dy - s * 0.5,
      center.dx - s * 1.5, center.dy + s * 0.8,
      center.dx, center.dy + s * 1.3,
    );
    path.cubicTo(
      center.dx + s * 1.5, center.dy + s * 0.8,
      center.dx + s * 1.2, center.dy - s * 0.5,
      center.dx, center.dy + s * 0.5,
    );
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_HeartPainter old) => old.t != t;
}
