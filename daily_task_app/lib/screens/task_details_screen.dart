import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/task_model.dart';
import '../services/firestore_service.dart';
import '../utils/constants.dart';
import 'package:intl/intl.dart';

class TaskDetailsScreen extends StatefulWidget {
  final TaskModel task;
  const TaskDetailsScreen({super.key, required this.task});

  @override
  State<TaskDetailsScreen> createState() => _TaskDetailsScreenState();
}

class _TaskDetailsScreenState extends State<TaskDetailsScreen> {
  late String _status;
  late double _completion;
  late TextEditingController _noteController;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _status = widget.task.status;
    _completion = widget.task.completionPercentage;
    _noteController = TextEditingController(text: widget.task.progressNote);
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _updateProgress() async {
    setState(() => _isLoading = true);
    final firestoreService = Provider.of<FirestoreService>(context, listen: false);
    
    await firestoreService.updateTaskProgress(
      widget.task.id,
      _status,
      _completion,
      _noteController.text.trim(),
    );

    setState(() => _isLoading = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Progress updated successfully')),
      );
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Task Details')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.task.title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text('Due: ${DateFormat('MMM dd, yyyy').format(widget.task.date)}'),
            const SizedBox(height: 16),
            Text('Description:', style: Theme.of(context).textTheme.titleMedium),
            Text(widget.task.description),
            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 16),
            Text('Update Progress', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: _status,
              decoration: const InputDecoration(labelText: 'Status'),
              items: [
                AppConstants.statusPending,
                AppConstants.statusInProgress,
                AppConstants.statusCompleted,
              ].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (val) => setState(() => _status = val!),
            ),
            const SizedBox(height: 16),
            Text('Completion: ${_completion.toInt()}%'),
            Slider(
              value: _completion,
              min: 0,
              max: 100,
              divisions: 100,
              label: _completion.round().toString(),
              onChanged: (val) => setState(() => _completion = val),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _noteController,
              decoration: const InputDecoration(labelText: 'Progress Note'),
              maxLines: 3,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _updateProgress,
                child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text('Update Progress'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
