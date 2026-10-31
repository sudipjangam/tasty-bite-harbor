import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';

enum PrinterTransport { lan, bluetooth }

class BluetoothDeviceInfo {
  final String name;
  final String address;
  const BluetoothDeviceInfo({required this.name, required this.address});

  factory BluetoothDeviceInfo.fromMap(Map<dynamic, dynamic> map) {
    return BluetoothDeviceInfo(
      name: map['name']?.toString() ?? 'Unknown Device',
      address: map['address']?.toString() ?? '',
    );
  }
}

class ThermalPrinterService {
  static final ThermalPrinterService _instance =
      ThermalPrinterService._internal();
  factory ThermalPrinterService() => _instance;
  ThermalPrinterService._internal();

  static const MethodChannel _btChannel = MethodChannel(
    'com.swadeshisolutions.app/bluetooth_printer',
  );

  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  PrinterTransport activeTransport = PrinterTransport.lan;
  String? configuredLanIp = '192.168.1.100';

  // Paper width: 32 columns for 58mm (2-inch), 48 columns for 80mm (3-inch)
  int paperWidth = 32;

  String? _connectedBtAddress;
  String? _connectedBtName;
  bool _intentionalDisconnect = false;
  Future<bool>? _inFlightReconnect;
  int _connectionGeneration = 0;

  String? get connectedBtAddress => _connectedBtAddress;
  String? get connectedBtName => _connectedBtName;

  /// Load persisted printer settings and previous Bluetooth printer
  Future<void> initPreferences() async {
    try {
      final savedWidth = await _storage.read(key: 'printer_paper_width');
      if (savedWidth != null) {
        paperWidth = int.tryParse(savedWidth) ?? 32;
      }
      final savedAddr = await _storage.read(key: 'last_bt_address');
      final savedName = await _storage.read(key: 'last_bt_name');
      if (savedAddr != null && savedAddr.isNotEmpty) {
        _connectedBtAddress = savedAddr;
        _connectedBtName = savedName;
      }
    } catch (e) {
      debugPrint('[ThermalPrinter] initPreferences error: $e');
    }
  }

  /// Change and persist paper width (32 for 58mm, 48 for 80mm)
  Future<void> setPaperWidth(int width) async {
    paperWidth = (width == 48) ? 48 : 32;
    await _storage.write(key: 'printer_paper_width', value: paperWidth.toString());
  }

  // ─── Bluetooth Permissions & Discovery ─────────────────────────────────────

  /// Explicitly requests BLUETOOTH_CONNECT and BLUETOOTH_SCAN on Android 12+ (API 31+)
  Future<bool> requestBluetoothPermissions() async {
    try {
      final bool? granted = await _btChannel.invokeMethod<bool>(
        'requestBluetoothPermissions',
      );
      return granted == true;
    } catch (e) {
      debugPrint('[ThermalPrinter] requestBluetoothPermissions error: $e');
      return false;
    }
  }

  /// Get list of paired / bonded Bluetooth devices on Android
  Future<List<BluetoothDeviceInfo>> getBondedBluetoothDevices({
    bool requestPermission = true,
  }) async {
    try {
      if (requestPermission) {
        await requestBluetoothPermissions();
      }

      final List<dynamic>? list = await _btChannel.invokeListMethod(
        'getBondedDevices',
      );
      if (list == null) return [];
      return list
          .whereType<Map<dynamic, dynamic>>()
          .map((m) => BluetoothDeviceInfo.fromMap(m))
          .toList();
    } catch (e) {
      debugPrint('[ThermalPrinter] getBondedBluetoothDevices failed: $e');
      return [];
    }
  }

  /// Connect to Bluetooth printer by MAC address
  Future<bool> connectBluetooth(String address, {String? deviceName}) async {
    final int generation = ++_connectionGeneration;
    try {
      final bool? success = await _btChannel.invokeMethod<bool>('connect', {
        'address': address,
      });

      // Cancellation check: if user called disconnect or a newer connect was triggered while in flight
      if (generation != _connectionGeneration || _intentionalDisconnect) {
        try {
          await _btChannel.invokeMethod('disconnect');
        } catch (_) {}
        return false;
      }

      if (success == true) {
        _connectedBtAddress = address;
        _connectedBtName = deviceName ?? address;
        _intentionalDisconnect = false;
        activeTransport = PrinterTransport.bluetooth;
        // Persist for seamless auto-reconnect
        try {
          await _storage.write(key: 'last_bt_address', value: address);
          if (deviceName != null) {
            await _storage.write(key: 'last_bt_name', value: deviceName);
          }
        } catch (_) {}
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('[ThermalPrinter] connectBluetooth failed: $e');
      return false;
    }
  }

  /// Disconnect Bluetooth printer and reset transport to LAN
  Future<bool> disconnectBluetooth() async {
    _connectionGeneration++;
    _intentionalDisconnect = true;
    _connectedBtAddress = null;
    _connectedBtName = null;
    activeTransport = PrinterTransport.lan; // Reset to LAN immediately
    try {
      await _btChannel.invokeMethod('disconnect');
      try {
        await _storage.delete(key: 'last_bt_address');
        await _storage.delete(key: 'last_bt_name');
      } catch (_) {}
      return true;
    } catch (e) {
      debugPrint('[ThermalPrinter] disconnectBluetooth failed: $e');
      return false;
    }
  }

  /// Check if Bluetooth printer is actively connected
  Future<bool> isBluetoothConnected() async {
    try {
      final bool? connected = await _btChannel.invokeMethod<bool>(
        'isConnected',
      );
      return connected == true;
    } catch (e) {
      return false;
    }
  }

  /// Silently auto-reconnects to the last used printer in background (shared in-flight Future)
  Future<bool> autoReconnect() {
    if (_inFlightReconnect != null) return _inFlightReconnect!;
    _inFlightReconnect = _doAutoReconnect().whenComplete(() {
      _inFlightReconnect = null;
    });
    return _inFlightReconnect!;
  }

  Future<bool> _doAutoReconnect() async {
    if (_intentionalDisconnect) return false;
    try {
      final isConn = await isBluetoothConnected();
      if (isConn) return true;
      return await autoConnectPairedPrinter(requestPermission: false);
    } catch (e) {
      debugPrint('[ThermalPrinter] autoReconnect error: $e');
      return false;
    }
  }

  /// Print ESC/POS byte buffer to Bluetooth printer
  Future<bool> printOverBluetooth(Uint8List bytes) async {
    try {
      final bool? success = await _btChannel.invokeMethod<bool>('printBytes', {
        'bytes': bytes,
      });
      return success == true;
    } catch (e) {
      debugPrint('[ThermalPrinter] printOverBluetooth failed: $e');
      return false;
    }
  }

  /// Attempts to auto-connect to an already-paired printer
  Future<bool> autoConnectPairedPrinter({bool requestPermission = false}) async {
    if (_intentionalDisconnect) return false;
    try {
      final devices = await getBondedBluetoothDevices(
        requestPermission: requestPermission,
      );
      if (devices.isEmpty) return false;

      // 1. Check saved printer from secure storage or memory
      final savedAddr = _connectedBtAddress ?? await _storage.read(key: 'last_bt_address');
      if (savedAddr != null && savedAddr.isNotEmpty) {
        final match = devices.firstWhere(
          (d) => d.address == savedAddr,
          orElse: () => const BluetoothDeviceInfo(name: '', address: ''),
        );
        if (match.address.isNotEmpty) {
          return await connectBluetooth(match.address, deviceName: match.name);
        }
      }

      // 2. Look for printer names matching common thermal printer models
      // Narrowed heuristic: specific prefixes, excluding generic "pos" and "bluetooth"
      final printerMatch = devices.firstWhere((d) {
        final name = d.name.toLowerCase();
        return name.startsWith('kpc') ||
            name.startsWith('cn8') ||
            name.contains('print') ||
            name.contains('mpt') ||
            name.contains('rpp') ||
            name.contains('thermal');
      }, orElse: () => const BluetoothDeviceInfo(name: '', address: ''));

      if (printerMatch.address.isNotEmpty) {
        debugPrint(
          '[ThermalPrinter] Auto-connecting to identified printer: ${printerMatch.name}',
        );
        return await connectBluetooth(
          printerMatch.address,
          deviceName: printerMatch.name,
        );
      }
      return false;
    } catch (e) {
      debugPrint('[ThermalPrinter] Auto-connect error: $e');
      return false;
    }
  }

  // ─── LAN / WiFi TCP Socket Printing ──────────────────────────────────────────

  /// Test connectivity to a LAN/WiFi thermal printer on port 9100
  Future<bool> testLanPrinter(String ip, {int port = 9100}) async {
    try {
      final socket = await Socket.connect(
        ip,
        port,
        timeout: const Duration(seconds: 3),
      );
      socket.destroy();
      return true;
    } catch (e) {
      debugPrint('[ThermalPrinter] Ping failed: $e');
      return false;
    }
  }

  /// Print ESC/POS byte buffer to LAN/WiFi printer
  Future<bool> printOverLan({
    required String ip,
    int port = 9100,
    required Uint8List bytes,
  }) async {
    Socket? socket;
    try {
      socket = await Socket.connect(
        ip,
        port,
        timeout: const Duration(seconds: 5),
      );
      socket.add(bytes);
      await socket.flush();
      await Future.delayed(const Duration(milliseconds: 200));
      socket.destroy();
      return true;
    } catch (e) {
      debugPrint('[ThermalPrinter] Print failed: $e');
      socket?.destroy();
      return false;
    }
  }

  // ─── Unified Printing Method ───────────────────────────────────────────────

  /// Print bytes over currently active transport (Bluetooth or LAN)
  Future<bool> printBuffer({
    required Uint8List bytes,
    String? lanIp,
    int lanPort = 9100,
  }) async {
    if (activeTransport == PrinterTransport.bluetooth) {
      var isConn = await isBluetoothConnected();
      if (!isConn) {
        // Transparent auto-reconnect before sending bytes
        await autoReconnect();
        isConn = await isBluetoothConnected();
      }
      if (!isConn) {
        debugPrint('[ThermalPrinter] Bluetooth printer not connected after auto-reconnect');
        return false;
      }
      return printOverBluetooth(bytes);
    } else {
      final targetIp = (lanIp != null && lanIp.isNotEmpty)
          ? lanIp
          : configuredLanIp;
      if (targetIp == null || targetIp.isEmpty) return false;
      return printOverLan(ip: targetIp, port: lanPort, bytes: bytes);
    }
  }

  // ─── Text & ESC/POS Formatting ─────────────────────────────────────────────

  /// Encode text safely for ESC/POS receipt printers without throwing
  List<int> _encodeText(String text) {
    final sanitized = text
        .replaceAll('₹', 'Rs.')
        .replaceAll('•', '-')
        .replaceAll('–', '-')
        .replaceAll('—', '-')
        .replaceAll('★', '*')
        .replaceAll('⚡', '!')
        .replaceAll('🥦', '')
        .replaceAll('🍗', '');

    // Replace any remaining non-Latin-1 character with '?'
    final buffer = StringBuffer();
    for (int i = 0; i < sanitized.length; i++) {
      final code = sanitized.codeUnitAt(i);
      if (code <= 0xFF) {
        buffer.writeCharCode(code);
      } else {
        buffer.write('?');
      }
    }
    return latin1.encode(buffer.toString());
  }

  /// Generate ESC/POS invoice receipt matching web app 1:1
  Uint8List buildReceiptBytes({
    required String restaurantName,
    String? restaurantAddress,
    String? restaurantPhone,
    String? restaurantGstin,
    required String orderNumber,
    String? tableName,
    String? customerName,
    String? customerMobile,
    String? serverName,
    DateTime? orderDate,
    required List<Map<String, dynamic>> items,
    required double subtotal,
    double discount = 0.0,
    double tax = 0.0,
    double cgst = 0.0,
    double sgst = 0.0,
    required double total,
    String? upiId,
    int? customWidth,
  }) {
    final W = customWidth ?? paperWidth; // 32 for 58mm, 48 for 80mm
    final sep = '${'-' * W}\n';

    String row2(String left, String right) {
      final pad = (W - left.length - right.length).clamp(1, W);
      return '$left${' ' * pad}$right\n';
    }

    String formatItemRow(String name, String qty, String rate, String amt) {
      final qLen = W == 32 ? 3 : 4;
      final rLen = W == 32 ? 5 : 7;
      final aLen = W == 32 ? 6 : 8;
      final restLen = 1 + qLen + 1 + rLen + 1 + aLen;
      final nameLen = W - restLen;

      final n = (name.length > nameLen ? name.substring(0, nameLen) : name).padRight(nameLen);
      final q = (qty.length > qLen ? qty.substring(0, qLen) : qty).padLeft(qLen);
      final r = (rate.length > rLen ? rate.substring(0, rLen) : rate).padLeft(rLen);
      final a = (amt.length > aLen ? amt.substring(0, aLen) : amt).padLeft(aLen);

      return '$n $q $r $a\n';
    }

    final List<int> bytes = [];

    // ESC @: Initialize printer
    bytes.addAll([0x1B, 0x40]);

    // ESC a 1: Center alignment
    bytes.addAll([0x1B, 0x61, 0x01]);

    // Double height text for restaurant name
    bytes.addAll([0x1D, 0x21, 0x01]); // Double height
    bytes.addAll([0x1B, 0x45, 0x01]); // Bold on
    bytes.addAll(_encodeText('$restaurantName\n'));
    bytes.addAll([0x1D, 0x21, 0x00]); // Normal text
    bytes.addAll([0x1B, 0x45, 0x00]); // Bold off

    if (restaurantAddress != null && restaurantAddress.isNotEmpty) {
      bytes.addAll(_encodeText('$restaurantAddress\n'));
    }
    if (restaurantPhone != null && restaurantPhone.isNotEmpty) {
      bytes.addAll(_encodeText('Ph: $restaurantPhone\n'));
    }
    if (restaurantGstin != null &&
        restaurantGstin.isNotEmpty &&
        restaurantGstin.toLowerCase() != 'not set') {
      bytes.addAll(_encodeText('GSTIN: $restaurantGstin\n'));
    }

    bytes.addAll(_encodeText(sep));

    // ESC a 0: Left alignment
    bytes.addAll([0x1B, 0x61, 0x00]);

    // Metadata
    final displayTable = (tableName != null && tableName.isNotEmpty)
        ? (tableName.toLowerCase().startsWith('table') ? tableName : 'Table $tableName')
        : (customerName != null && customerName.isNotEmpty ? customerName : 'POS');

    final leftBill = 'Bill#: #$orderNumber';
    final rightTarget = 'To: $displayTable';
    if (leftBill.length + rightTarget.length + 1 <= W) {
      bytes.addAll(_encodeText(row2(leftBill, rightTarget)));
    } else {
      bytes.addAll(_encodeText('$leftBill\n$rightTarget\n'));
    }

    final now = orderDate ?? DateTime.now();
    final dateStr = 'Date: ${DateFormat('dd MMM yyyy').format(now)}';
    final timeStr = 'Time: ${DateFormat('hh:mm a').format(now).toLowerCase()}';
    if (dateStr.length + timeStr.length + 1 <= W) {
      bytes.addAll(_encodeText(row2(dateStr, timeStr)));
    } else {
      bytes.addAll(_encodeText('$dateStr  $timeStr\n'));
    }

    if (serverName != null && serverName.isNotEmpty) {
      final sLine = 'Server: $serverName';
      final mLine = (customerMobile != null && customerMobile.isNotEmpty)
          ? 'Ph: $customerMobile'
          : '';
      if (mLine.isNotEmpty && sLine.length + mLine.length + 1 <= W) {
        bytes.addAll(_encodeText(row2(sLine, mLine)));
      } else {
        bytes.addAll(_encodeText('$sLine\n'));
        if (mLine.isNotEmpty) bytes.addAll(_encodeText('$mLine\n'));
      }
    }

    if (customerName != null &&
        customerName.isNotEmpty &&
        customerName != displayTable &&
        !displayTable.contains(customerName)) {
      bytes.addAll(_encodeText('Guest: $customerName\n'));
    }

    bytes.addAll(_encodeText(sep));

    // Items table header
    bytes.addAll([0x1B, 0x45, 0x01]); // Bold on
    bytes.addAll(_encodeText(formatItemRow('Item', 'Qty', 'Rate', 'Amt')));
    bytes.addAll([0x1B, 0x45, 0x00]); // Bold off
    bytes.addAll(_encodeText(sep));

    // Items
    for (final item in items) {
      final name = item['name']?.toString() ?? 'Item';
      final qty = (item['qty'] ?? item['quantity'] ?? 1).toString();
      final rateNum = (item['rate'] ?? item['price'] ?? 0.0);
      final rate = (rateNum is num) ? rateNum.toDouble().toStringAsFixed(0) : '0';
      final amtNum = item['amount'] ??
          ((rateNum is num ? rateNum.toDouble() : 0.0) * (int.tryParse(qty) ?? 1));
      final amt = (amtNum is num) ? amtNum.toDouble().toStringAsFixed(0) : '0';

      bytes.addAll(_encodeText(formatItemRow(name, qty, rate, amt)));
    }

    bytes.addAll(_encodeText(sep));

    // Totals
    bytes.addAll(_encodeText(row2('Sub Total:', subtotal.toStringAsFixed(2))));
    if (discount > 0) {
      bytes.addAll(_encodeText(row2('Discount:', '-${discount.toStringAsFixed(2)}')));
    }
    if (cgst > 0) {
      bytes.addAll(_encodeText(row2('CGST:', cgst.toStringAsFixed(2))));
    }
    if (sgst > 0) {
      bytes.addAll(_encodeText(row2('SGST:', sgst.toStringAsFixed(2))));
    } else if (tax > 0) {
      bytes.addAll(_encodeText(row2('Tax / GST:', tax.toStringAsFixed(2))));
    }

    bytes.addAll(_encodeText(sep));

    // Bold Grand Total
    bytes.addAll([0x1B, 0x45, 0x01]); // Bold on
    bytes.addAll(_encodeText(row2('Net Amount:', 'Rs.${total.toStringAsFixed(2)}')));
    bytes.addAll([0x1B, 0x45, 0x00]); // Bold off
    bytes.addAll(_encodeText(sep));

    // Footer
    bytes.addAll([0x1B, 0x61, 0x01]); // Center
    bytes.addAll([0x1B, 0x45, 0x01]); // Bold
    bytes.addAll(_encodeText('Thank You! Please visit again\n\n\n'));
    bytes.addAll([0x1B, 0x45, 0x00]); // Bold off

    // GS V 0: Paper Cut
    bytes.addAll([0x1D, 0x56, 0x00]);

    return Uint8List.fromList(bytes);
  }

  /// Generate ESC/POS Kitchen Order Ticket (KOT)
  Uint8List buildKOTBytes({
    required String tableName,
    required String serverName,
    required String orderType,
    required int roundNumber,
    required List<Map<String, dynamic>> items,
    bool isAddition = false,
  }) {
    final List<int> bytes = [];

    // ESC @: Initialize printer
    bytes.addAll([0x1B, 0x40]);

    // ESC a 1: Center alignment
    bytes.addAll([0x1B, 0x61, 0x01]);

    // Double height & width text
    bytes.addAll([0x1D, 0x21, 0x11]);
    bytes.addAll(_encodeText(isAddition || roundNumber > 1 ? '*** ADDITION ***\n' : '*** KITCHEN ORDER ***\n'));

    // Normal text
    bytes.addAll([0x1D, 0x21, 0x00]);
    bytes.addAll(_encodeText('Table: $tableName | Round: #$roundNumber\n'));
    bytes.addAll(
      _encodeText('Type: ${orderType.toUpperCase()} | Server: $serverName\n'),
    );
    bytes.addAll(
      _encodeText(
        'Time: ${DateTime.now().toLocal().toString().substring(11, 16)}\n',
      ),
    );
    bytes.addAll(_encodeText('================================\n'));

    // ESC a 0: Left alignment
    bytes.addAll([0x1B, 0x61, 0x00]);

    // Bold large items
    int totalCount = 0;
    for (final item in items) {
      final name = item['name'] ?? 'Item';
      final qty = item['quantity'] ?? item['qty'] ?? 1;
      final notes = item['notes']?.toString();
      totalCount += (qty is int ? qty : int.tryParse(qty.toString()) ?? 1);

      bytes.addAll([0x1D, 0x21, 0x01]); // Double height
      bytes.addAll(_encodeText('$qty x $name\n'));
      bytes.addAll([0x1D, 0x21, 0x00]); // Normal

      if (notes != null && notes.isNotEmpty) {
        bytes.addAll(_encodeText('   * Note: $notes\n'));
      }
    }

    bytes.addAll(_encodeText('================================\n'));
    if (isAddition || roundNumber > 1) {
      bytes.addAll([0x1B, 0x61, 0x01]); // Center
      bytes.addAll(_encodeText('** ADDITION ONLY ($totalCount items) **\n'));
    }
    bytes.addAll(_encodeText('\n\n\n'));

    // GS V 0: Paper Cut
    bytes.addAll([0x1D, 0x56, 0x00]);

    return Uint8List.fromList(bytes);
  }
}
