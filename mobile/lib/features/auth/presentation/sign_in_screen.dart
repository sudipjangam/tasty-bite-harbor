import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/supabase_config.dart';
import '../../../core/access/access_controller.dart';
import '../../../main.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignIn() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await SupabaseConfig.client.auth.signInWithPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      final user = response.user;
      final session = response.session;

      if (user != null && session != null) {
        // Derive restaurantId and permissions
        String? restaurantId = user.userMetadata?['restaurant_id']?.toString();
        if (restaurantId == null || restaurantId.isEmpty) {
          try {
            final profile = await SupabaseConfig.client
                .from('profiles')
                .select('restaurant_id')
                .eq('id', user.id)
                .maybeSingle();
            restaurantId = profile?['restaurant_id']?.toString();
          } catch (_) {}
        }

        final isAdmin = user.appMetadata['role'] == 'admin' ||
            user.userMetadata?['role'] == 'owner';

        await AccessController().loadUserAccess(
          user.id,
          restaurantId,
          hasFullAccess: isAdmin,
        );

        if (!mounted) return;
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const MainNavigationShell()),
          (route) => false,
        );
      } else {
        setState(() => _errorMessage = 'Invalid email or password.');
      }
    } on AuthException catch (e) {
      setState(() => _errorMessage = e.message);
    } catch (e) {
      setState(() => _errorMessage = 'Network connection failed. Please try again.');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _demoLogin() async {
    setState(() => _isLoading = true);
    await AccessController().loadUserAccess(
      'demo-user',
      'demo-restaurant',
      hasFullAccess: true,
    );
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MainNavigationShell()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bgLight,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo
                  Center(
                    child: Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(22),
                        boxShadow: const [
                          BoxShadow(
                            color: Colors.black12,
                            blurRadius: 12,
                            offset: Offset(0, 4),
                          ),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Image.asset(
                        'assets/icons/swadeshi-icon-192.png',
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) =>
                            const Icon(LucideIcons.store, size: 44, color: AppColors.primary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Title & Subtitle
                  Text(
                    'Swadeshi POS',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.poppins(
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textLight,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Sign in to access restaurant terminal',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      color: AppColors.textMutedLight,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Error Banner
                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.destructive.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.destructive.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.alertCircle, size: 18, color: AppColors.destructive),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: AppColors.destructive,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                  ],

                  // Email Field
                  Text(
                    'Email Address',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textLight,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                    style: GoogleFonts.inter(fontSize: 14, color: AppColors.textLight),
                    decoration: InputDecoration(
                      hintText: 'name@restaurant.com',
                      prefixIcon: const Icon(LucideIcons.mail, size: 18, color: Colors.grey),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.borderLight),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.borderLight),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) return 'Enter your email';
                      if (!val.contains('@')) return 'Enter a valid email';
                      return null;
                    },
                  ),
                  const SizedBox(height: 18),

                  // Password Field
                  Text(
                    'Password',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textLight,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    style: GoogleFonts.inter(fontSize: 14, color: AppColors.textLight),
                    decoration: InputDecoration(
                      hintText: '••••••••',
                      prefixIcon: const Icon(LucideIcons.lock, size: 18, color: Colors.grey),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
                          size: 18,
                          color: Colors.grey,
                        ),
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.borderLight),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(color: AppColors.borderLight),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                    validator: (val) {
                      if (val == null || val.isEmpty) return 'Enter your password';
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),

                  // Sign In Button
                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _handleSignIn,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.5,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : Text(
                              'Sign In to Terminal',
                              style: GoogleFonts.poppins(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),

                  // Developer Demo Bypass (gated behind kDebugMode)
                  if (kDebugMode) ...[
                    const SizedBox(height: 16),
                    OutlinedButton.icon(
                      onPressed: _isLoading ? null : _demoLogin,
                      icon: const Icon(LucideIcons.terminal, size: 16),
                      label: const Text('Developer Demo Login'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

