import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/supabase_config.dart';
import '../../../core/access/access_controller.dart';
import '../../../core/hardware/thermal_printer_service.dart';
import '../../auth/presentation/sign_in_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _printerIpController = TextEditingController(text: '192.168.1.100');
  final _upiVpaController = TextEditingController();
  bool _isTestingLanPrinter = false;

  // Bluetooth Printer State
  List<BluetoothDeviceInfo> _pairedBtDevices = [];
  bool _isScanningBt = false;
  bool _isConnectingBt = false;
  bool _isTestingBt = false;
  String? _selectedBtAddress;
  String? _selectedBtName;
  bool _isBtConnected = false;
  int _paperWidth = 32;

  @override
  void initState() {
    super.initState();
    _upiVpaController.text = AccessController().restaurantUpiVpa ?? 'swadeshisolutions@upi';
    _paperWidth = ThermalPrinterService().paperWidth;
    _checkInitialBtStatus();
  }

  Future<void> _checkInitialBtStatus() async {
    final service = ThermalPrinterService();
    var connected = await service.isBluetoothConnected();
    if (!connected) {
      connected = await service.autoConnectPairedPrinter();
    }
    final list = await service.getBondedBluetoothDevices();
    if (mounted) {
      setState(() {
        _isBtConnected = connected;
        _pairedBtDevices = list;
        _selectedBtAddress = service.connectedBtAddress ?? (list.isNotEmpty ? list.first.address : null);
        _selectedBtName = service.connectedBtName ?? (list.isNotEmpty ? list.first.name : null);
      });
    }
  }

  @override
  void dispose() {
    _printerIpController.dispose();
    _upiVpaController.dispose();
    super.dispose();
  }

  Future<void> _scanBluetoothDevices() async {
    setState(() => _isScanningBt = true);
    final service = ThermalPrinterService();
    final connected = await service.autoConnectPairedPrinter(requestPermission: true);
    final list = await service.getBondedBluetoothDevices(requestPermission: true);
    if (!mounted) return;
    setState(() {
      _pairedBtDevices = list;
      _isBtConnected = connected;
      _isScanningBt = false;
      if (service.connectedBtAddress != null) {
        _selectedBtAddress = service.connectedBtAddress;
        _selectedBtName = service.connectedBtName;
      } else if (list.isNotEmpty) {
        final printer = list.firstWhere(
          (d) {
            final n = d.name.toLowerCase();
            return n.startsWith('kpc') || n.startsWith('cn8') || n.startsWith('pos') || n.startsWith('mpt') || n.contains('print');
          },
          orElse: () => list.first,
        );
        _selectedBtAddress = printer.address;
        _selectedBtName = printer.name;
      }
    });

    if (list.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No paired Bluetooth printers found. Pair in Android Settings first.'),
          backgroundColor: AppColors.occupied,
        ),
      );
    } else if (connected) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Auto-connected to ${_selectedBtName ?? "Printer"} ✓'),
          backgroundColor: AppColors.available,
        ),
      );
    }
  }

  Future<void> _toggleBtConnect() async {
    final service = ThermalPrinterService();
    if (_isBtConnected) {
      setState(() => _isConnectingBt = true);
      await service.disconnectBluetooth();
      if (!mounted) return;
      setState(() {
        _isBtConnected = false;
        _isConnectingBt = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bluetooth Printer Disconnected')),
      );
    } else {
      if (_selectedBtAddress == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a paired Bluetooth printer first')),
        );
        return;
      }
      setState(() => _isConnectingBt = true);
      final ok = await service.connectBluetooth(_selectedBtAddress!, deviceName: _selectedBtName);
      if (!mounted) return;
      setState(() {
        _isBtConnected = ok;
        _isConnectingBt = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(ok ? 'Connected to $_selectedBtName ✓' : 'Failed to connect to printer'),
          backgroundColor: ok ? AppColors.available : AppColors.destructive,
        ),
      );
    }
  }

  Future<void> _testBtPrint() async {
    setState(() => _isTestingBt = true);
    final service = ThermalPrinterService();

    final testSlip = service.buildReceiptBytes(
      restaurantName: AccessController().restaurantName ?? 'Tasty Bite Harbor',
      orderNumber: 'TEST-001',
      items: [
        {'name': 'Test Print Sample', 'qty': 1, 'price': 0.0},
        {'name': 'Bluetooth SPP 58/80mm', 'qty': 1, 'price': 0.0},
      ],
      subtotal: 0.0,
      tax: 0.0,
      total: 0.0,
    );

    final ok = await service.printOverBluetooth(testSlip);
    if (!mounted) return;
    setState(() => _isTestingBt = false);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(ok ? 'Test slip sent to printer! ✓' : 'Print failed. Ensure printer is powered and paired.'),
        backgroundColor: ok ? AppColors.available : AppColors.destructive,
      ),
    );
  }

  Future<void> _testLanPrinter() async {
    setState(() => _isTestingLanPrinter = true);
    final ip = _printerIpController.text.trim();
    final service = ThermalPrinterService();
    final isOnline = await service.testLanPrinter(ip);

    if (!mounted) return;
    setState(() => _isTestingLanPrinter = false);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          isOnline
              ? 'Printer at $ip is ONLINE!'
              : 'Printer at $ip is unreachable. Check WiFi.',
        ),
        backgroundColor: isOnline ? AppColors.available : AppColors.destructive,
      ),
    );
  }

  void _saveUpi() {
    final vpa = _upiVpaController.text.trim();
    AccessController().updateRestaurantDetails(upiVpa: vpa);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('UPI VPA settings saved successfully'),
        backgroundColor: AppColors.available,
      ),
    );
  }

  Future<void> _handleSignOut() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          'Sign Out?',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
        ),
        content: const Text('Are you sure you want to sign out from this terminal?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.destructive),
            child: const Text('Sign Out', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    try {
      await SupabaseConfig.client.auth.signOut();
    } catch (_) {}

    AccessController().clear();

    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const SignInScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final access = AccessController();
    final user = SupabaseConfig.client.auth.currentUser;
    final email = user?.email ?? 'Terminal User (${access.userId ?? "Demo"})';
    final role = access.isAdmin ? 'Administrator / Owner' : 'Staff Member';
    final restaurant = access.restaurantName ?? 'Tasty Bite Harbor';

    return Scaffold(
      backgroundColor: AppColors.bgLight,
      appBar: AppBar(
        title: Text(
          'Terminal Settings',
          style: GoogleFonts.poppins(fontWeight: FontWeight.w700),
        ),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Profile & Restaurant Card
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(LucideIcons.user, color: AppColors.primary, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        restaurant,
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textLight,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        email,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppColors.textMutedLight,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.available.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          role,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: AppColors.available,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Payment QR / UPI Configuration
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.qrCode, color: AppColors.primary, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'UPI Payment Configuration',
                        style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w700),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Payee VPA for Dynamic QR on POS screen:',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMutedLight),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _upiVpaController,
                        decoration: InputDecoration(
                          hintText: 'merchant@bankupi',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: AppColors.bgLight,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _saveUpi,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                      child: const Text('Save'),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ─── Bluetooth Thermal Printer Section (ESC/POS SPP) ─────────────────
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.bluetooth, color: Color(0xFF2563EB), size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Bluetooth Thermal Printer',
                        style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w700),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (_isBtConnected)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('CONNECTED', style: TextStyle(color: Color(0xFF16A34A), fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Connect wireless 58mm / 80mm ESC/POS receipt printer:',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMutedLight),
                ),
                const SizedBox(height: 12),

                // Scan / Refresh Button
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _isScanningBt ? null : _scanBluetoothDevices,
                    icon: _isScanningBt
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(LucideIcons.refreshCw, size: 15),
                    label: Text(_isScanningBt ? 'Scanning paired devices...' : 'Scan Paired Bluetooth Devices'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),

                if (_pairedBtDevices.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: _selectedBtAddress,
                    decoration: InputDecoration(
                      labelText: 'Select Bluetooth Printer',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    items: _pairedBtDevices.map((d) {
                      return DropdownMenuItem(
                        value: d.address,
                        child: Text('${d.name} (${d.address})', overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        final found = _pairedBtDevices.firstWhere((d) => d.address == val);
                        setState(() {
                          _selectedBtAddress = val;
                          _selectedBtName = found.name;
                        });
                      }
                    },
                  ),
                ],

                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _isConnectingBt ? null : _toggleBtConnect,
                        icon: _isConnectingBt
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : Icon(_isBtConnected ? LucideIcons.powerOff : LucideIcons.power, size: 15),
                        label: Text(_isBtConnected ? 'Disconnect' : 'Connect Printer'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isBtConnected ? AppColors.destructive : const Color(0xFF2563EB),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                    if (_isBtConnected) ...[
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: _isTestingBt ? null : _testBtPrint,
                        icon: _isTestingBt
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(LucideIcons.printer, size: 15),
                        label: const Text('Test Print'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ─── Thermal Paper Width (58mm vs 80mm) ──────────────────────────────
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.fileText, color: Color(0xFFF97316), size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Paper Width Setup',
                        style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w700),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Select your thermal printer paper roll size for aligned receipts:',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textMutedLight),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() => _paperWidth = 32);
                          ThermalPrinterService().setPaperWidth(32);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Printer set to 58mm (2-inch / 32 columns)')),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          backgroundColor: _paperWidth == 32 ? AppColors.primary.withOpacity(0.12) : null,
                          side: BorderSide(
                            color: _paperWidth == 32 ? AppColors.primary : AppColors.borderLight,
                            width: _paperWidth == 32 ? 2 : 1,
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: Text(
                          '58mm (2-inch)',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _paperWidth == 32 ? AppColors.primary : AppColors.textLight,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () {
                          setState(() => _paperWidth = 48);
                          ThermalPrinterService().setPaperWidth(48);
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Printer set to 80mm (3-inch / 48 columns)')),
                          );
                        },
                        style: OutlinedButton.styleFrom(
                          backgroundColor: _paperWidth == 48 ? AppColors.primary.withOpacity(0.12) : null,
                          side: BorderSide(
                            color: _paperWidth == 48 ? AppColors.primary : AppColors.borderLight,
                            width: _paperWidth == 48 ? 2 : 1,
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: Text(
                          '80mm (3-inch)',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _paperWidth == 48 ? AppColors.primary : AppColors.textLight,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ─── LAN / WiFi Printer Section ──────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(LucideIcons.wifi, color: AppColors.primary, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'LAN Receipt Printer (Port 9100)',
                        style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w700),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _printerIpController,
                  decoration: InputDecoration(
                    labelText: 'Printer IP Address',
                    hintText: '192.168.1.100',
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    filled: true,
                    fillColor: AppColors.bgLight,
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: _isTestingLanPrinter ? null : _testLanPrinter,
                    icon: _isTestingLanPrinter
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(LucideIcons.wifi, size: 16),
                    label: Text(_isTestingLanPrinter ? 'Testing...' : 'Test LAN Connection'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.primary,
                      side: const BorderSide(color: AppColors.primary),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // App Details
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.cardLight,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Theme Mode', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textLight)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text('Light Mode', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('App Version', style: GoogleFonts.inter(fontSize: 14, color: AppColors.textLight)),
                    const Text('1.0.0 (Native Release)', style: TextStyle(color: Colors.grey, fontSize: 13)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Sign Out Button
          SizedBox(
            height: 50,
            child: ElevatedButton.icon(
              onPressed: _handleSignOut,
              icon: const Icon(LucideIcons.logOut, size: 18),
              label: Text(
                'Sign Out from Terminal',
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.destructive,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
