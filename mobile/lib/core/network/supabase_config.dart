import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String url = 'https://clmsoetktmvhazctlans.supabase.co';
  static const String anonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbXNvZXRrdG12aGF6Y3RsYW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MTE5NTIsImV4cCI6MjA1NDA4Nzk1Mn0.4j8CLdQn9By5XawbdC4LlWhFumIQT6gqCl2lZnQwQWk';

  static SupabaseClient get client => Supabase.instance.client;

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: url,
      anonKey: anonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }
}

