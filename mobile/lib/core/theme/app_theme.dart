import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Light Mode (Mirrors src/index.css :root)
  static const bgLight = Color(0xFFF7FAFC);
  static const cardLight = Color(0xFFFFFFFF);
  static const textLight = Color(0xFF1A202C);
  static const textMutedLight = Color(0xFF718096);
  static const borderLight = Color(0xFFE2E8F0);

  // Dark Mode (Mirrors src/index.css .dark)
  static const bgDark = Color(0xFF0F172A);
  static const cardDark = Color(0xFF1E293B);
  static const textDark = Color(0xFFF8FAFC);
  static const textMutedDark = Color(0xFF94A3B8);
  static const borderDark = Color(0xFF334155);

  // Primary Brand Colors
  static const primary = Color(0xFF4F46E5); // Indigo
  static const primaryHover = Color(0xFF4338CA);
  static const secondary = Color(0xFF64748B);

  // Status Colors (Matching Badges)
  static const available = Color(0xFF10B981); // Emerald
  static const occupied = Color(0xFFF59E0B);  // Amber
  static const billed = Color(0xFF3B82F6);    // Blue
  static const reserved = Color(0xFF8B5CF6);  // Purple
  static const destructive = Color(0xFFEF4444); // Red
}

class AppGradients {
  static const dashboard = LinearGradient(colors: [Color(0xFF8B5CF6), Color(0xFF9333EA)]);
  static const qsrPos = LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEA580C)]);
  static const quickServe = LinearGradient(colors: [Color(0xFFF97316), Color(0xFFEC4899)]);
  static const orders = LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF4F46E5)]);
  static const kitchen = LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]);
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.bgLight,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        surface: AppColors.cardLight,
        onSurface: AppColors.textLight,
      ),
      textTheme: GoogleFonts.poppinsTextTheme().copyWith(
        bodyLarge: GoogleFonts.inter(fontSize: 16, color: AppColors.textLight),
        bodyMedium: GoogleFonts.inter(fontSize: 14, color: AppColors.textLight),
        bodySmall: GoogleFonts.inter(fontSize: 12, color: AppColors.textMutedLight),
      ),
      cardTheme: CardThemeData(
        color: AppColors.cardLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          side: const BorderSide(color: AppColors.borderLight, width: 1),
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.bgDark,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        surface: AppColors.cardDark,
        onSurface: AppColors.textDark,
      ),
      textTheme: GoogleFonts.poppinsTextTheme(ThemeData.dark().textTheme).copyWith(
        bodyLarge: GoogleFonts.inter(fontSize: 16, color: AppColors.textDark),
        bodyMedium: GoogleFonts.inter(fontSize: 14, color: AppColors.textDark),
        bodySmall: GoogleFonts.inter(fontSize: 12, color: AppColors.textMutedDark),
      ),
      cardTheme: CardThemeData(
        color: AppColors.cardDark,
        elevation: 0,
        shape: RoundedRectangleBorder(
          side: const BorderSide(color: AppColors.borderDark, width: 1),
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}

