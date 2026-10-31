import 'package:flutter/foundation.dart';
import '../network/supabase_config.dart';

class AccessController extends ChangeNotifier {
  static final AccessController _instance = AccessController._internal();
  factory AccessController() => _instance;
  AccessController._internal();

  bool _initialized = false;
  bool _isAdmin = false;
  String? _restaurantId;
  String? _userId;
  String? _restaurantName;
  String? _restaurantAddress;
  String? _restaurantPhone;
  String? _restaurantGstin;
  String? _serverName;
  String? _restaurantUpiVpa = 'swadeshisolutions@upi';

  final Set<String> _permissions = {};
  final Set<String> _subscriptionComponents = {};

  bool get isInitialized => _initialized;
  bool get isAdmin => _isAdmin;
  String? get restaurantId => _restaurantId;
  String? get userId => _userId;
  String? get restaurantName => _restaurantName;
  String? get restaurantAddress => _restaurantAddress;
  String? get restaurantPhone => _restaurantPhone;
  String? get restaurantGstin => _restaurantGstin;
  String? get serverName => _serverName;
  String? get restaurantUpiVpa => _restaurantUpiVpa;

  void updateRestaurantDetails({String? name, String? upiVpa, String? address, String? phone, String? gstin, String? server}) {
    if (name != null) _restaurantName = name;
    if (upiVpa != null) _restaurantUpiVpa = upiVpa;
    if (address != null) _restaurantAddress = address;
    if (phone != null) _restaurantPhone = phone;
    if (gstin != null) _restaurantGstin = gstin;
    if (server != null) _serverName = server;
    notifyListeners();
  }

  Future<void> loadUserAccess(String userId, String? restaurantId, {bool hasFullAccess = false}) async {
    _initialized = false;
    _permissions.clear();
    _subscriptionComponents.clear();
    _restaurantName = null;
    _restaurantAddress = null;
    _restaurantPhone = null;
    _restaurantGstin = null;
    _serverName = null;
    _restaurantUpiVpa = null;
    _userId = userId;
    _restaurantId = restaurantId;
    _isAdmin = hasFullAccess;

    try {
      // 1. Fetch User Profile to verify role and real restaurant
      try {
        final profile = await SupabaseConfig.client
            .from('profiles')
            .select('*, roles:role_id(*)')
            .eq('id', userId)
            .maybeSingle();

        if (profile != null) {
          final sName = profile['full_name'] ?? profile['name'] ?? profile['display_name'];
          if (sName != null && sName.toString().isNotEmpty) {
            _serverName = sName.toString();
          }

          final roleName = (profile['role_name_text'] ?? profile['role'] ?? profile['roles']?['name'] ?? '').toString().toLowerCase();
          final fullAcc = profile['roles']?['has_full_access'] == true ||
              roleName == 'owner' ||
              roleName == 'admin' ||
              roleName == 'superadmin';
          if (fullAcc) {
            _isAdmin = true;
          }

          final pRestId = profile['restaurant_id']?.toString();
          if (pRestId != null && pRestId.isNotEmpty) {
            _restaurantId = pRestId;
          }
        }
      } catch (e) {
        debugPrint('[AccessController] Profile query note: $e');
      }

      // 2. Fetch Restaurant Name, Address, Phone, GSTIN & UPI VPA
      try {
        var restQuery = SupabaseConfig.client
            .from('restaurants')
            .select('id, name, upi_vpa, address, phone, gstin, city, state, pincode');

        Map<String, dynamic>? rest;
        if (_restaurantId != null && _restaurantId!.isNotEmpty) {
          rest = await restQuery.eq('id', _restaurantId!).maybeSingle();
        }

        if (rest != null) {
          if (rest['name'] != null && rest['name'].toString().isNotEmpty) {
            _restaurantName = rest['name'].toString();
          }
          if (rest['upi_vpa'] != null && rest['upi_vpa'].toString().isNotEmpty) {
            _restaurantUpiVpa = rest['upi_vpa'].toString();
          }
          final addr = rest['address']?.toString() ?? '';
          final city = rest['city']?.toString() ?? '';
          final state = rest['state']?.toString() ?? '';
          final pin = rest['pincode']?.toString() ?? '';
          final parts = [addr, city, [state, pin].where((s) => s.isNotEmpty).join(' ')].where((s) => s.isNotEmpty).toList();
          _restaurantAddress = parts.isNotEmpty ? parts.join(', ') : (addr.isNotEmpty ? addr : null);
          _restaurantPhone = rest['phone']?.toString();
          _restaurantGstin = rest['gstin']?.toString();
        }
      } catch (e) {
        debugPrint('[AccessController] Restaurant query note: $e');
      }

      if (_isAdmin) {
        _initialized = true;
        notifyListeners();
        return;
      }

      // 3. Fetch User Role Permissions from get_user_permissions RPC
      try {
        final permResponse = await SupabaseConfig.client.rpc(
          'get_user_permissions',
          params: {'p_user_id': userId},
        );
        if (permResponse is List) {
          for (final row in permResponse) {
            final p = (row['permission'] ?? '').toString().toLowerCase().trim();
            if (p.isNotEmpty) _permissions.add(p);
          }
        }
      } catch (e) {
        debugPrint('[AccessController] get_user_permissions note: $e');
      }

      // 4. Fetch User Components from get_user_components RPC
      try {
        final compResponse = await SupabaseConfig.client.rpc(
          'get_user_components',
          params: {'user_id': userId},
        );
        if (compResponse is List) {
          for (final row in compResponse) {
            final c = (row['component_name'] ?? '').toString().toLowerCase().trim();
            if (c.isNotEmpty) _permissions.add(c);
          }
        }
      } catch (_) {}

      // 5. Fetch Restaurant Subscription Components if restaurantId exists
      if (_restaurantId != null && _restaurantId!.isNotEmpty) {
        try {
          final subResponse = await SupabaseConfig.client
              .from('restaurant_subscriptions')
              .select('components, subscription_plans(components)')
              .eq('restaurant_id', _restaurantId!)
              .eq('status', 'active')
              .maybeSingle();

          if (subResponse != null) {
            final planData = subResponse['subscription_plans'];
            final planComps = (planData != null && planData['components'] is List)
                ? (planData['components'] as List).map((e) => e.toString().toLowerCase().trim()).toSet()
                : <String>{};
            final customComps = (subResponse['components'] is List)
                ? (subResponse['components'] as List).map((e) => e.toString().toLowerCase().trim()).toSet()
                : <String>{};

            _subscriptionComponents.addAll(planComps);
            _subscriptionComponents.addAll(customComps);
          }
        } catch (e) {
          debugPrint('[AccessController] Subscription query note: $e');
        }
      }
    } catch (e) {
      debugPrint('[AccessController] Error loading access: $e');
    } finally {
      _initialized = true;
      notifyListeners();
    }
  }

  /// Layer 1: Subscription Gate
  bool hasSubscriptionAccess(String component) {
    if (_isAdmin) return true;
    final c = component.toLowerCase().trim();

    // QSR POS / QuickServe / POS equivalence
    if (c == 'pos' || c == 'qsr-pos' || c == 'quickserve' || c == 'qsr_pos') {
      if (_subscriptionComponents.any((k) =>
          k.startsWith('qsr-pos') ||
          k.startsWith('quickserve') ||
          k.startsWith('pos'))) {
        return true;
      }
      // Logged in terminal for active restaurant defaults core POS on
      if (_restaurantId != null && _restaurantId!.isNotEmpty) {
        return true;
      }
    }

    if (_subscriptionComponents.isEmpty) {
      // If subscription couldn't be loaded or no row, allow standard operational features
      return true;
    }

    return _subscriptionComponents.any((k) =>
        k == c || k.startsWith('$c.') || c.startsWith('$k.'));
  }

  /// Layer 2: Permission Guard
  bool hasPermission(String permission) {
    if (_isAdmin) return true;
    final p = permission.toLowerCase().trim();

    // QSR POS / QuickServe / POS equivalence
    if (p == 'pos.view' ||
        p == 'pos' ||
        p == 'qsr-pos' ||
        p == 'quickserve' ||
        p == 'qsr-pos.basic' ||
        p == 'quickserve.basic') {
      const aliases = [
        'pos.view',
        'pos',
        'pos.basic',
        'qsr-pos',
        'qsr-pos.basic',
        'qsr-pos.mobile_ui_v2',
        'qsr-pos.custom_widgets',
        'quickserve',
        'quickserve.basic',
        'quickserve.view',
        'qsr',
        'qsr_pos'
      ];
      for (final a in aliases) {
        if (_permissions.contains(a) || _subscriptionComponents.contains(a)) {
          return true;
        }
      }
      if (_subscriptionComponents.any((c) =>
          c.startsWith('qsr-pos') ||
          c.startsWith('quickserve') ||
          c.startsWith('pos'))) {
        return true;
      }
      if (_permissions.any((c) =>
          c.startsWith('qsr-pos') ||
          c.startsWith('quickserve') ||
          c.startsWith('pos'))) {
        return true;
      }
      // POS terminal is always available to authenticated staff of active restaurant
      if (_restaurantId != null && _restaurantId!.isNotEmpty) {
        return true;
      }
    }

    if (_permissions.contains(p)) return true;
    if (_subscriptionComponents.contains(p)) return true;
    if (_subscriptionComponents.any((c) => c == p || c.startsWith('$p.') || p.startsWith('$c.'))) return true;
    if (_permissions.any((c) => c == p || c.startsWith('$p.') || p.startsWith('$c.'))) return true;

    // Default to true for core restaurant staff operations if permissions table is unconfigured
    if (_permissions.isEmpty && _restaurantId != null) {
      return true;
    }

    return false;
  }

  /// Layer 3: Feature Lock
  bool hasFeature(String featureKey) {
    if (_isAdmin) return true;
    final component = featureKey.split('.').first;
    return hasSubscriptionAccess(component);
  }

  void clear() {
    _initialized = false;
    _isAdmin = false;
    _restaurantId = null;
    _userId = null;
    _restaurantName = null;
    _restaurantAddress = null;
    _restaurantPhone = null;
    _restaurantGstin = null;
    _serverName = null;
    _restaurantUpiVpa = null;
    _permissions.clear();
    _subscriptionComponents.clear();
    notifyListeners();
  }
}
