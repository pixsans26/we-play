import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'providers/auth_provider.dart';
import 'providers/game_provider.dart';
import 'providers/theme_provider.dart';
import 'providers/cycle_provider.dart';
import 'providers/notification_provider.dart';
import 'theme/app_theme.dart';

import 'screens/auth/auth_screens.dart';
import 'screens/onboarding/profile_setup_screen.dart';
import 'screens/onboarding/onboarding_screen.dart';
import 'screens/game/home_screen.dart';
import 'screens/game/main_layout_screen.dart';
import 'screens/game/task_scratch_screen.dart';
import 'screens/game/image_scratch_screen.dart';
import 'screens/game/spin_wheel_screen.dart';
import 'screens/game/lottery_screen.dart';
import 'screens/game/partner_screen.dart';
import 'screens/game/notifications_screen.dart';
import 'screens/game/edit_profile_screen.dart';
import 'screens/game/other_screens.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const WePlayApp());
}

class WePlayApp extends StatelessWidget {
  const WePlayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => GameProvider()),
        ChangeNotifierProvider(create: (_) => CycleProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (_, themeProvider, __) {
          return MaterialApp(
            title: 'WePlay',
            debugShowCheckedModeBanner: false,
            theme: lightTheme,
            darkTheme: darkTheme,
            themeMode: themeProvider.isDark ? ThemeMode.dark : ThemeMode.light,
            home: const _Splash(),
            routes: {
              '/login': (_) => const LoginScreen(),
              '/signup': (_) => const SignupScreen(),
              '/onboarding': (_) => const OnboardingScreen(),
              '/profile-setup': (_) => const ProfileSetupScreen(),
              '/home': (_) => const MainLayoutScreen(),
              '/task-scratch': (_) => const TaskScratchScreen(),
              '/image-scratch': (_) => const ImageScratchScreen(),
              '/spin-wheel': (_) => const SpinWheelScreen(),
              '/lottery': (_) => const LotteryScreen(),
              '/history': (_) => const HistoryScreen(),
              '/profile': (_) => const ProfileScreen(),
              '/settings': (_) => const SettingsScreen(),
              '/partner': (_) => const PartnerScreen(),
              '/notifications': (_) => const NotificationsScreen(),
              '/edit-profile': (_) => const EditProfileScreen(),
            },
          );
        },
      ),
    );
  }
}

/// Splash/Router — decides where to go based on auth state
class _Splash extends StatefulWidget {
  const _Splash();

  @override
  State<_Splash> createState() => _SplashState();
}

class _SplashState extends State<_Splash> with SingleTickerProviderStateMixin {
  late AnimationController _anim;
  late Animation<double> _scaleAnim;
  late Animation<double> _opacityAnim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 1800));
    _scaleAnim = Tween<double>(begin: 0.6, end: 1.0).animate(CurvedAnimation(parent: _anim, curve: Curves.elasticOut));
    _opacityAnim = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _anim, curve: const Interval(0, 0.4, curve: Curves.easeIn)));
    _anim.forward();
    WidgetsBinding.instance.addPostFrameCallback((_) => _navigate());
  }

  Future<void> _navigate() async {
    await Future.delayed(const Duration(milliseconds: 2000));
    if (!mounted) return;
    final prefs = await SharedPreferences.getInstance();
    final onboardingSeen = prefs.getBool('onboarding_seen') ?? false;

    if (!onboardingSeen) {
      if (mounted) Navigator.of(context).pushReplacementNamed('/onboarding');
      return;
    }

    final auth = context.read<AuthProvider>();
    if (auth.isLoggedIn) {
      final cp = auth.coupleProfile;
      if (cp == null || cp.partnerAName.isEmpty) {
        Navigator.of(context).pushReplacementNamed('/profile-setup');
      } else {
        Navigator.of(context).pushReplacementNamed('/home');
      }
    } else {
      Navigator.of(context).pushReplacementNamed('/login');
    }
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF150025), Color(0xFF3B0764), Color(0xFF4C1D95)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: AnimatedBuilder(
            animation: _anim,
            builder: (_, __) => Opacity(
              opacity: _opacityAnim.value,
              child: Transform.scale(
                scale: _scaleAnim.value,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 100, height: 100,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [Color(0xFF9333EA), Color(0xFFDB2777)]),
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [BoxShadow(color: const Color(0xFFDB2777).withOpacity(0.5), blurRadius: 30, offset: const Offset(0, 10))],
                      ),
                      child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 56),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'WePlay',
                      style: TextStyle(color: Colors.white, fontSize: 40, fontWeight: FontWeight.w900, letterSpacing: 1),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Play together, grow together 💕',
                      style: TextStyle(color: Colors.white60, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
