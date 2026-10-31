import 'package:flutter/material.dart';
import 'access_controller.dart';

/// Layer 1: Subscription Gate
class SubscriptionGate extends StatelessWidget {
  final String component;
  final Widget child;
  final Widget? fallback;

  const SubscriptionGate({
    super.key,
    required this.component,
    required this.child,
    this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AccessController(),
      builder: (context, _) {
        final access = AccessController();
        if (!access.isInitialized) {
          return const Center(child: CircularProgressIndicator.adaptive());
        }

        if (access.hasSubscriptionAccess(component)) {
          return child;
        }

        return fallback ??
            Scaffold(
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.lock_outline, size: 56, color: Colors.amber),
                      const SizedBox(height: 16),
                      Text(
                        'Feature Not in Your Plan',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'The "$component" module is not active on your restaurant subscription.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
            );
      },
    );
  }
}

/// Layer 2: Permission Guard
class PermissionGuard extends StatelessWidget {
  final String permission;
  final Widget child;
  final Widget? fallback;

  const PermissionGuard({
    super.key,
    required this.permission,
    required this.child,
    this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AccessController(),
      builder: (context, _) {
        final access = AccessController();
        if (!access.isInitialized) {
          return const Center(child: CircularProgressIndicator.adaptive());
        }

        if (access.hasPermission(permission)) {
          return child;
        }

        return fallback ??
            Scaffold(
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shield_outlined, size: 56, color: Colors.redAccent),
                      const SizedBox(height: 16),
                      Text(
                        'Access Denied',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'You do not have the required "$permission" permission.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ),
            );
      },
    );
  }
}

/// Layer 3: Feature Lock
class FeatureLock extends StatelessWidget {
  final String feature;
  final Widget child;
  final Widget? fallback;

  const FeatureLock({
    super.key,
    required this.feature,
    required this.child,
    this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: AccessController(),
      builder: (context, _) {
        final access = AccessController();
        if (!access.isInitialized) {
          return child;
        }
        if (access.hasFeature(feature)) {
          return child;
        }

        return fallback ??
            Opacity(
              opacity: 0.5,
              child: Stack(
                children: [
                  AbsorbPointer(child: child),
                  const Positioned.fill(
                    child: Center(
                      child: Icon(Icons.lock, size: 28, color: Colors.orangeAccent),
                    ),
                  ),
                ],
              ),
            );
      },
    );
  }
}

