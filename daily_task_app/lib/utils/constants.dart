import 'package:flutter/material.dart';

class AppColors {
  static const Color primary = Color(0xFF6200EE);
  static const Color primaryVariant = Color(0xFF3700B3);
  static const Color secondary = Color(0xFF03DAC6);
  static const Color secondaryVariant = Color(0xFF018786);
  static const Color background = Color(0xFFF5F5F5);
  static const Color surface = Colors.white;
  static const Color error = Color(0xFFB00020);
  static const Color onPrimary = Colors.white;
  static const Color onSecondary = Colors.black;
  static const Color onBackground = Colors.black;
  static const Color onSurface = Colors.black;
  static const Color onError = Colors.white;
}

class AppConstants {
  static const String appName = 'Daily Task Manager';
  
  // Roles
  static const String roleManager = 'Manager';
  static const String roleEmployee = 'Employee';
  static const String roleAdmin = 'Admin';
  static const String roleScheduler = 'Scheduler';

  // Task Priorities
  static const String priorityHigh = 'High';
  static const String priorityMedium = 'Medium';
  static const String priorityLow = 'Low';

  // Task Statuses
  static const String statusPending = 'Pending';
  static const String statusInProgress = 'In Progress';
  static const String statusCompleted = 'Completed';
}
