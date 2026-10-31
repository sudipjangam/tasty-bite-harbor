import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';

enum MobileTab { dashboard, pos, orders, kitchen, more }

class MobileNavigationBar extends StatelessWidget {
  final MobileTab currentTab;
  final ValueChanged<MobileTab> onTabSelected;

  const MobileNavigationBar({
    super.key,
    required this.currentTab,
    required this.onTabSelected,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? AppColors.cardDark : Colors.white;
    final border = isDark ? AppColors.borderDark : AppColors.borderLight;

    return Container(
      decoration: BoxDecoration(
        color: bg,
        border: Border(top: BorderSide(color: border, width: 1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      padding: EdgeInsets.only(
        top: 8,
        bottom: MediaQuery.of(context).padding.bottom + 6,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildItem(
            tab: MobileTab.dashboard,
            icon: LucideIcons.home,
            label: 'Dashboard',
            gradient: AppGradients.dashboard,
          ),
          _buildItem(
            tab: MobileTab.pos,
            icon: LucideIcons.zap,
            label: 'QSR POS',
            gradient: const LinearGradient(
              colors: [Color(0xFFF97316), Color(0xFFEA580C)], // Vibrant Orange like Image 5
            ),
          ),
          _buildItem(
            tab: MobileTab.orders,
            icon: LucideIcons.shoppingCart,
            label: 'Orders',
            gradient: AppGradients.orders,
          ),
          _buildItem(
            tab: MobileTab.kitchen,
            icon: LucideIcons.chefHat,
            label: 'Kitchen',
            gradient: AppGradients.kitchen,
          ),
          _buildItem(
            tab: MobileTab.more,
            icon: LucideIcons.moreHorizontal,
            label: 'More',
            gradient: const LinearGradient(
              colors: [Color(0xFF64748B), Color(0xFF475569)],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildItem({
    required MobileTab tab,
    required IconData icon,
    required String label,
    required LinearGradient gradient,
  }) {
    final isSelected = currentTab == tab;

    return Semantics(
      button: true,
      label: label,
      selected: isSelected,
      child: InkWell(
        onTap: () => onTabSelected(tab),
        borderRadius: BorderRadius.circular(14),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              curve: Curves.easeInOut,
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                gradient: isSelected ? gradient : null,
                borderRadius: BorderRadius.circular(14), // Squircle shape
                boxShadow: isSelected
                    ? [
                        BoxShadow(
                          color: gradient.colors.first.withOpacity(0.35),
                          blurRadius: 8,
                          offset: const Offset(0, 3),
                        )
                      ]
                    : null,
              ),
              child: Icon(
                icon,
                size: 22,
                color: isSelected ? Colors.white : Colors.grey.shade500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected
                    ? (tab == MobileTab.pos ? const Color(0xFFEA580C) : gradient.colors.first)
                    : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
