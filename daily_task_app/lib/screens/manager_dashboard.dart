import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../models/task_model.dart';
import '../utils/constants.dart';
import 'assign_task_screen.dart';
import 'package:intl/intl.dart';

class ManagerDashboard extends StatelessWidget {
  const ManagerDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    final firestoreService = Provider.of<FirestoreService>(context, listen: false);
    final authService = Provider.of<AuthService>(context, listen: false);

    return Scaffold(
      appBar: AppBar(
        title: Text(authService.user?.role.toLowerCase() == 'scheduler' 
            ? 'My Scheduled Tasks' 
            : 'Manager Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => authService.signOut(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const AssignTaskScreen()),
          );
        },
        child: const Icon(Icons.add),
      ),
      body: StreamBuilder<List<TaskModel>>(
        stream: firestoreService.getAllTasks(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          
          final user = authService.user;
          List<TaskModel> tasks = snapshot.data ?? [];
          
          // Filter for Schedulers
          if (user?.role.toLowerCase() == 'scheduler') {
            tasks = tasks.where((t) => t.assignedBy == user?.uid).toList();
          }

          if (tasks.isEmpty) {
            return const Center(child: Text('No tasks found.'));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: tasks.length,
            itemBuilder: (context, index) {
              final task = tasks[index];
              return Card(
                margin: const EdgeInsets.only(bottom: 16),
                child: ListTile(
                  title: Text(task.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text('Assigned to: ${task.assignedTo}'), // Ideally fetch name
                      Text('Status: ${task.status}'),
                      Text('Priority: ${task.priority}'),
                      Text('Date: ${DateFormat('MMM dd, yyyy').format(task.date)}'),
                    ],
                  ),
                  trailing: CircularProgressIndicator(
                    value: task.completionPercentage / 100,
                    backgroundColor: Colors.grey[200],
                    color: _getStatusColor(task.status),
                  ),
                  isThreeLine: true,
                ),
              );
            },
          );
        },
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case AppConstants.statusCompleted:
        return AppColors.secondary;
      case AppConstants.statusInProgress:
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }
}
