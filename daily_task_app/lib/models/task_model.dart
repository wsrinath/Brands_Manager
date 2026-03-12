import 'package:cloud_firestore/cloud_firestore.dart';

class TaskModel {
  final String id;
  final String title;
  final String description;
  final String assignedTo; // User ID
  final String assignedBy; // User ID
  final DateTime date;
  final String priority;
  final String status;
  final double completionPercentage;
  final String progressNote;
  final String? attachmentUrl;

  TaskModel({
    required this.id,
    required this.title,
    required this.description,
    required this.assignedTo,
    required this.assignedBy,
    required this.date,
    required this.priority,
    required this.status,
    required this.completionPercentage,
    required this.progressNote,
    this.attachmentUrl,
  });

  factory TaskModel.fromMap(Map<String, dynamic> data, String id) {
    return TaskModel(
      id: id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      assignedTo: data['assignedTo'] ?? '',
      assignedBy: data['assignedBy'] ?? '',
      date: (data['date'] as Timestamp).toDate(),
      priority: data['priority'] ?? 'Medium',
      status: data['status'] ?? 'Pending',
      completionPercentage: (data['completionPercentage'] ?? 0).toDouble(),
      progressNote: data['progressNote'] ?? '',
      attachmentUrl: data['attachmentUrl'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'title': title,
      'description': description,
      'assignedTo': assignedTo,
      'assignedBy': assignedBy,
      'date': Timestamp.fromDate(date),
      'priority': priority,
      'status': status,
      'completionPercentage': completionPercentage,
      'progressNote': progressNote,
      'attachmentUrl': attachmentUrl,
    };
  }
}
