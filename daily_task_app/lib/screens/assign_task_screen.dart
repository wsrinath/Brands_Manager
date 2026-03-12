import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/firestore_service.dart';
import '../services/auth_service.dart';
import '../models/task_model.dart';
import '../utils/constants.dart';

class AssignTaskScreen extends StatefulWidget {
  const AssignTaskScreen({super.key});

  @override
  State<AssignTaskScreen> createState() => _AssignTaskScreenState();
}

class _AssignTaskScreenState extends State<AssignTaskScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  String _selectedPriority = AppConstants.priorityMedium;
  String? _selectedEmployeeId;
  bool _isLoading = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _assignTask() async {
    if (_formKey.currentState!.validate() && _selectedEmployeeId != null) {
      setState(() => _isLoading = true);

      final firestoreService = Provider.of<FirestoreService>(
        context,
        listen: false,
      );
      final authService = Provider.of<AuthService>(context, listen: false);
      final currentUser = authService.currentUser;

      if (currentUser == null) return;

      final newTask = TaskModel(
        id: '', // Firestore will generate ID if we use .add(), but here we construct model first.
        // Actually FirestoreService.createTask uses .add(), so ID is ignored/generated there.
        // Ideally we shouldn't pass ID here or make it optional.
        // For now passing empty string as it's not used in creation logic.
        title: _titleController.text.trim(),
        description: _descController.text.trim(),
        assignedTo: _selectedEmployeeId!,
        assignedBy: currentUser.id,
        date: _selectedDate,
        priority: _selectedPriority,
        status: AppConstants.statusPending,
        completionPercentage: 0.0,
        progressNote: '',
      );

      await firestoreService.createTask(newTask);

      setState(() => _isLoading = false);
      if (mounted) Navigator.pop(context);
    } else if (_selectedEmployeeId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select an employee')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final firestoreService = Provider.of<FirestoreService>(
      context,
      listen: false,
    );

    return Scaffold(
      appBar: AppBar(title: const Text('Assign Task')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(labelText: 'Task Title'),
                validator: (val) => val!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descController,
                decoration: const InputDecoration(labelText: 'Description'),
                maxLines: 3,
                validator: (val) => val!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _selectedPriority,
                decoration: const InputDecoration(labelText: 'Priority'),
                items:
                    [
                          AppConstants.priorityHigh,
                          AppConstants.priorityMedium,
                          AppConstants.priorityLow,
                        ]
                        .map((p) => DropdownMenuItem(value: p, child: Text(p)))
                        .toList(),
                onChanged: (val) => setState(() => _selectedPriority = val!),
              ),
              const SizedBox(height: 16),
              // Reverting changes: restoring Assign To dropdown
              StreamBuilder<QuerySnapshot>(
                stream: firestoreService.getEmployees(),
                builder: (context, snapshot) {
                  if (!snapshot.hasData)
                    return const CircularProgressIndicator();

                  final employees = snapshot.data!.docs;
                  return DropdownButtonFormField<String>(
                    value: _selectedEmployeeId,
                    decoration: const InputDecoration(labelText: 'Assign To'),
                    items: employees.map((doc) {
                      final data = doc.data() as Map<String, dynamic>;
                      return DropdownMenuItem(
                        value: doc.id,
                        child: Text(data['name'] ?? data['email']),
                      );
                    }).toList(),
                    onChanged: (val) =>
                        setState(() => _selectedEmployeeId = val),
                  );
                },
              ),
              const SizedBox(height: 16),
              ListTile(
                title: Text(
                  'Due Date: ${_selectedDate.toLocal().toString().split(' ')[0]}',
                ),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime(2100),
                  );
                  if (picked != null) setState(() => _selectedDate = picked);
                },
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _assignTask,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Assign Task'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
