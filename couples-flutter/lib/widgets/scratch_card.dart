import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';

class ScratchCard extends StatefulWidget {
  final Widget child;
  final ImageProvider? overlayImage;
  final double threshold;
  final double brushSize;
  final VoidCallback? onScratchComplete;

  const ScratchCard({
    super.key,
    required this.child,
    this.overlayImage,
    this.threshold = 0.35,
    this.brushSize = 50.0,
    this.onScratchComplete,
  });

  @override
  State<ScratchCard> createState() => _ScratchCardState();
}

class _ScratchCardState extends State<ScratchCard> {
  // A list of strokes, where each stroke is a list of points (offsets)
  final List<List<Offset>> _strokes = [];
  bool _completed = false;
  ui.Image? _image;
  bool _imageLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.overlayImage != null) {
      _loadImage();
    }
  }

  @override
  void didUpdateWidget(ScratchCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.overlayImage != oldWidget.overlayImage) {
      if (widget.overlayImage != null) {
        _loadImage();
      } else {
        setState(() => _image = null);
      }
    }
  }

  Future<void> _loadImage() async {
    if (_imageLoading) return;
    _imageLoading = true;
    final completer = Completer<ui.Image>();
    final stream = widget.overlayImage!.resolve(const ImageConfiguration());
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
      if (mounted) {
        setState(() {
          _image = img;
          _imageLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _imageLoading = false);
      }
    }
  }

  void _onPanStart(Offset localPos) {
    if (_completed) return;
    setState(() {
      _strokes.add([localPos]);
    });
    final box = context.findRenderObject() as RenderBox?;
    if (box != null) {
      _checkThreshold(box.size);
    }
  }

  void _onPanUpdate(Offset localPos) {
    if (_completed || _strokes.isEmpty) return;
    setState(() {
      _strokes.last.add(localPos);
    });
    final box = context.findRenderObject() as RenderBox?;
    if (box != null) {
      _checkThreshold(box.size);
    }
  }

  void _checkThreshold(Size size) {
    if (_completed) return;
    // Map points to grid cells to compute coverage percentage
    const double cell = 12.0;
    final cells = <String>{};
    final double halfBrush = widget.brushSize / 2;

    for (final stroke in _strokes) {
      for (final p in stroke) {
        // Mark cells in a square bounding box around the point
        final int startCol = ((p.dx - halfBrush) / cell).floor();
        final int endCol = ((p.dx + halfBrush) / cell).floor();
        final int startRow = ((p.dy - halfBrush) / cell).floor();
        final int endRow = ((p.dy + halfBrush) / cell).floor();

        for (int r = startRow; r <= endRow; r++) {
          for (int c = startCol; c <= endCol; c++) {
            cells.add('$c,$r');
          }
        }
      }
    }

    final total = (size.width / cell).ceil() * (size.height / cell).ceil();
    if (total > 0 && cells.length / total >= widget.threshold) {
      setState(() => _completed = true);
      widget.onScratchComplete?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onPanStart: (d) => _onPanStart(d.localPosition),
      onPanUpdate: (d) => _onPanUpdate(d.localPosition),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          fit: StackFit.expand,
          children: [
            widget.child,
            if (!_completed)
              RepaintBoundary(
                child: CustomPaint(
                  painter: _ScratchPainter(
                    strokes: _strokes,
                    image: _image,
                    brushSize: widget.brushSize,
                  ),
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
  final List<List<Offset>> strokes;
  final ui.Image? image;
  final double brushSize;

  _ScratchPainter({
    required this.strokes,
    required this.image,
    required this.brushSize,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Create an offscreen layer to enable BlendMode.clear masking
    canvas.saveLayer(Rect.fromLTWH(0, 0, size.width, size.height), Paint());

    if (image != null) {
      // Draw loaded overlay image
      final src = Rect.fromLTWH(0, 0, image!.width.toDouble(), image!.height.toDouble());
      final dst = Rect.fromLTWH(0, 0, size.width, size.height);
      canvas.drawImageRect(image!, src, dst, Paint());
    } else {
      // Draw fallback gradient overlay matching React Native Svg gradient cover
      final paint = Paint()
        ..shader = ui.Gradient.linear(
          Offset.zero,
          Offset(size.width, size.height),
          [
            const Color(0xFFD946EF),
            const Color(0xFFA855F7),
            const Color(0xFF8B5CF6),
          ],
          [0.0, 0.5, 1.0],
          ui.TileMode.clamp,
        );
      canvas.drawRect(Rect.fromLTWH(0, 0, size.width, size.height), paint);
    }

    // Erase paths scratched by the user
    final erasePaint = Paint()
      ..blendMode = BlendMode.clear
      ..strokeWidth = brushSize
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..style = PaintingStyle.stroke;

    for (final stroke in strokes) {
      if (stroke.length > 1) {
        final path = Path()..moveTo(stroke[0].dx, stroke[0].dy);
        for (int i = 1; i < stroke.length; i++) {
          path.lineTo(stroke[i].dx, stroke[i].dy);
        }
        canvas.drawPath(path, erasePaint);
      } else if (stroke.length == 1) {
        canvas.drawCircle(stroke[0], brushSize / 2, Paint()..blendMode = BlendMode.clear);
      }
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(_ScratchPainter old) => true;
}
