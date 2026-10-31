import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'core/theme/app_theme.dart';
import 'core/network/supabase_config.dart';
import 'core/access/access_controller.dart';
import 'core/navigation/mobile_navigation_bar.dart';
import 'features/auth/presentation/sign_in_screen.dart';
import 'features/settings/presentation/settings_screen.dart';
import 'features/dashboard/presentation/dashboard_screen.dart';
import 'features/pos/bloc/cart_bloc.dart';
import 'features/pos/presentation/quickserve_pos_screen.dart';
import 'features/orders/presentation/orders_screen.dart';
import 'features/kitchen/presentation/kds_screen.dart';
import 'features/tables/presentation/tables_screen.dart';
import 'features/menu/presentation/menu_management_screen.dart';
import 'features/recipes/presentation/recipe_management_screen.dart';
import 'features/inventory/presentation/inventory_screen.dart';
import 'core/hardware/thermal_printer_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase PKCE Client
  try {
    await SupabaseConfig.initialize();
  } catch (e) {
    debugPrint('[Main] Supabase init warning: $e');
  }

  // Derive access state from authenticated Supabase session
  final session = SupabaseConfig.client.auth.currentSession;
  final access = AccessController();

  if (session != null) {
    final user = session.user;
    final isAdmin = user.appMetadata['role'] == 'admin' ||
        user.userMetadata?['role'] == 'owner';
    final restaurantId = user.userMetadata?['restaurant_id']?.toString();

    await access.loadUserAccess(
      user.id,
      restaurantId,
      hasFullAccess: isAdmin,
    );
  } else {
    access.clear();
  }

  runApp(const SwadeshiPosApp());
}

class SwadeshiPosApp extends StatelessWidget {
  const SwadeshiPosApp({super.key});

  @override
  Widget build(BuildContext context) {
    final hasSession = SupabaseConfig.client.auth.currentSession != null;

    return MultiBlocProvider(
      providers: [
        BlocProvider<CartBloc>(
          create: (context) => CartBloc(),
        ),
      ],
      child: MaterialApp(
        title: 'Swadeshi Solutions POS',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.lightTheme,
        themeMode: ThemeMode.light,
        home: hasSession ? const MainNavigationShell() : const SignInScreen(),
        routes: {
          '/signin': (context) => const SignInScreen(),
          '/settings': (context) => const SettingsScreen(),
          '/tables': (context) => const TablesScreen(),
          '/menu': (context) => const MenuManagementScreen(),
          '/recipes': (context) => const RecipeManagementScreen(),
          '/inventory': (context) => const InventoryScreen(),
        },
      ),
    );
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> with WidgetsBindingObserver {
  MobileTab _currentTab = MobileTab.dashboard;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Background auto-reconnect to paired thermal printer on startup
    ThermalPrinterService().initPreferences().then((_) {
      ThermalPrinterService().autoReconnect();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Auto-reconnect when user returns to app from recent apps or lockscreen
      ThermalPrinterService().autoReconnect();
    }
  }

  void _showMoreBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.75,
            ),
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(LucideIcons.moreHorizontal, color: AppColors.primary),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'More Operations',
                                style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textLight),
                              ),
                              const Text(
                                'Access full restaurant management modules',
                                style: TextStyle(fontSize: 12, color: Colors.grey),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Divider(),
                  ListTile(
                    leading: const Icon(LucideIcons.grid, color: AppColors.billed),
                    title: const Text('Floor Plan & Tables', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Live section layouts, table billing & guest counts'),
                    trailing: const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.pushNamed(context, '/tables');
                    },
                  ),
                  ListTile(
                    leading: const Icon(LucideIcons.bookOpen, color: AppColors.occupied),
                    title: const Text('Menu Catalog & 86', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Items, categories, prices & instant out-of-stock toggle'),
                    trailing: const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.pushNamed(context, '/menu');
                    },
                  ),
                  ListTile(
                    leading: const Icon(LucideIcons.chefHat, color: AppColors.available),
                    title: const Text('Recipe Management', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Ingredient portions, preparation steps & food cost analysis'),
                    trailing: const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.pushNamed(context, '/recipes');
                    },
                  ),
                  ListTile(
                    leading: const Icon(LucideIcons.boxes, color: AppColors.primary),
                    title: const Text('Inventory & Stock', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Raw ingredients, stock adjustments & reorder levels'),
                    trailing: const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.pushNamed(context, '/inventory');
                    },
                  ),
                  ListTile(
                    leading: const Icon(LucideIcons.settings, color: AppColors.secondary),
                    title: const Text('Terminal Settings', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('Printer setup, UPI VPA payee & account logout'),
                    trailing: const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.pushNamed(context, '/settings');
                    },
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: IndexedStack(
        index: _currentTab == MobileTab.more ? 0 : _currentTab.index,
        children: [
          DashboardScreen(
            onNavigateToPos: () => setState(() => _currentTab = MobileTab.pos),
            onNavigateToKitchen: () => setState(() => _currentTab = MobileTab.kitchen),
            onNavigateToCheckTables: () => Navigator.pushNamed(context, '/tables'),
          ),
          const QuickServePosScreen(),
          const OrdersScreen(),
          const KDSScreen(),
        ],
      ),
      bottomNavigationBar: MobileNavigationBar(
        currentTab: _currentTab,
        onTabSelected: (tab) {
          if (tab == MobileTab.more) {
            _showMoreBottomSheet(context);
          } else {
            setState(() => _currentTab = tab);
          }
        },
      ),
    );
  }
}
