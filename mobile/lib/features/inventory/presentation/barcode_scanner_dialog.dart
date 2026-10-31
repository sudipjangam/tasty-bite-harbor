import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../core/theme/app_theme.dart';

class BarcodeScannerDialog extends StatefulWidget {
  const BarcodeScannerDialog({super.key});

  @override
  State<BarcodeScannerDialog> createState() => _BarcodeScannerDialogState();
}

class _BarcodeScannerDialogState extends State<BarcodeScannerDialog> {
  late final MobileScannerController _controller;
  bool _isDisposed = false;
  bool _hasDetected = false;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );
  }

  @override
  void dispose() {
    _isDisposed = true;
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasDetected || _isDisposed) return;
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      final value = barcode.rawValue ?? barcode.displayValue;
      if (value != null && value.isNotEmpty) {
        _hasDetected = true;
        Navigator.of(context).pop(value);
        break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.black,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: SizedBox(
          width: double.infinity,
          height: 480,
          child: Stack(
            children: [
              // Scanner Camera View
              MobileScanner(
                controller: _controller,
                onDetect: _onDetect,
              ),

              // Overlay Targeting Reticle
              Center(
                child: Container(
                  width: 250,
                  height: 250,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.primary, width: 3),
                    borderRadius: BorderRadius.circular(16),
                    color: Colors.transparent,
                  ),
                  child: Stack(
                    children: [
                      // Scanner guide line
                      Center(
                        child: Container(
                          height: 2,
                          color: AppColors.primary.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Top Control Bar
              Positioned(
                top: 16,
                left: 16,
                right: 16,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    IconButton(
                      icon: const Icon(LucideIcons.x, color: Colors.white),
                      onPressed: () => Navigator.of(context).pop(),
                      style: IconButton.styleFrom(backgroundColor: Colors.black54),
                    ),
                    Row(
                      children: [
                        IconButton(
                          icon: const Icon(LucideIcons.flashlight, color: Colors.white),
                          onPressed: () => _controller.toggleTorch(),
                          style: IconButton.styleFrom(backgroundColor: Colors.black54),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(LucideIcons.refreshCw, color: Colors.white),
                          onPressed: () => _controller.switchCamera(),
                          style: IconButton.styleFrom(backgroundColor: Colors.black54),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Bottom instruction
              Positioned(
                bottom: 24,
                left: 20,
                right: 20,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black87,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Point camera at item barcode or SKU label',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

