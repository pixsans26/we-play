import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';

class ScratchCard extends StatefulWidget {
  final Widget child;
  final ImageProvider overlayImage;
  final double threshold;
  final VoidCallback? onScratchComplete;

  const ScratchCard({
    super.key,
    required this.child,
    required this.overlayImage,
    this.threshold = 0.45,
    this.onScratchComplete,
  });

  @override
  State<ScratchCard> createState() => _ScratchCardState();
}

class _ScratchCardState extends State<ScratchCard> {
  final List<Offset> _points = [];
  bool _completed = false;
  ui.Image? _image;

  @override
  void initState() {
    super.initState();
    _loadImage();
  }

  Future<void> _loadImage() async {
    final completer = Completer<ui.Image>();
    final stream = widget.overlayImage.resolve(const ImageConfiguration());
    late ImageStreamListener listener;
    listener = ImageStreamListener((info, _) {
      if (!completer.isCompleted) completer.complete(info.image);
      stream.removeListener(listener);
    }, onError: (e, _) {
      if (!completer.isCompleted) completer.completeError(e);
      stream.removeListener(listener);
    });
    stream.addListener(listener);
    try {
      final img = await completer.future;
      if (mounted) setState(() => _image = img);
    } catch (_) {}
  }

  void _onPan(Offset localPos) {
    if (_completed) return;
    setState(() => _points.add(localPos));
    final box = context.findRenderObject() as RenderBox?;
    if (box == null) return;
    _checkThreshold(box.size);
  }

  void _checkThreshold(Size size) {
    if (_completed) return;
    const cell = 20.0;
    final cells = <int>{};
    for (final p in _points) {
      final x = (p.dx / cell).floor();
      final y = (p.dy / cell).floor();
      cells.add(x * 10000 + y);
    }
    final total = (size.width / cell).ceil() * (size.height / cell).ceil();
    if (total > 0 && cells.length / total >= widget.threshold) {
      _completed = true;
      widget.onScratchComplete?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanUpdate: (d) {
        final box = context.findRenderObject() as RenderBox?;
        if (box != null) _onPan(box.globalToLocal(d.globalPosition));
      },
      child: ClipRRect(
        child: Stack(
          fit: StackFit.expand,
          children: [
            widget.child,
            if (_image != null && !_completed)
              RepaintBoundary(
                child: CustomPaint(
                  painter: _ScratchPainter(points: _points, image: _image!),
                  isComplex: true,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ScratchPainter extends CustomPainter {
  final List<Offset> points;
  final ui.Image image;

  _ScratchPainter({required this.points, required this.image});

  @override
  void paint(Canvas canvas, Size size) {
    canvas.saveLayer(Rect.fromLTWH(0, 0, size.width, size.height), Paint());

    // Draw overlay image
    final src = Rect.fromLTWH(0, 0, image.width.toDouble(), image.height.toDouble());
    final dst = Rect.fromLTWH(0, 0, size.width, size.height);
    canvas.drawImageRect(image, src, dst, Paint());

    // Erase scratch paths
    final erasePaint = Paint()
      ..blendMode = BlendMode.clear
      ..strokeWidth = 50
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    if (points.length > 1) {
      final path = Path()..moveTo(points[0].dx, points[0].dy);
      for (int i = 1; i < points.length; i++) {
        path.lineTo(points[i].dx, points[i].dy);
      }
      canvas.drawPath(path, erasePaint);
    } else if (points.length == 1) {
      canvas.drawCircle(points[0], 25, Paint()..blendMode = BlendMode.clear);
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(_ScratchPainter old) => old.points.length != points.length;
}
