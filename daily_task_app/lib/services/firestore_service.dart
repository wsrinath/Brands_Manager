import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../models/task_model.dart';

class FirestoreService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final FirebaseStorage _storage = FirebaseStorage.instance;

  // Create Task
  Future<void> createTask(TaskModel task) async {
    await _firestore.collection('tasks').add(task.toMap());
  }

  // Get Tasks for Employee
  Stream<List<TaskModel>> getEmployeeTasks(String employeeId) {
    return _firestore
        .collection('tasks')
        .where('assignedTo', isEqualTo: employeeId)
        .orderBy('date', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TaskModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  // Get All Tasks (Manager)
  Stream<List<TaskModel>> getAllTasks() {
    return _firestore
        .collection('tasks')
        .orderBy('date', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => TaskModel.fromMap(doc.data(), doc.id))
            .toList());
  }

  // Update Task Progress (Employee)
  Future<void> updateTaskProgress(String taskId, String status, double percentage, String note) async {
    await _firestore.collection('tasks').doc(taskId).update({
      'status': status,
      'completionPercentage': percentage,
      'progressNote': note,
    });
  }

  // Upload Attachment
  Future<String?> uploadAttachment(File file) async {
    try {
      String fileName = DateTime.now().millisecondsSinceEpoch.toString();
      Reference ref = _storage.ref().child('attachments/$fileName');
      UploadTask uploadTask = ref.putFile(file);
      TaskSnapshot snapshot = await uploadTask;
      return await snapshot.ref.getDownloadURL();
    } catch (e) {
      print('Error uploading file: $e');
      return null;
    }
  }

  // Get All Employees (for Manager assignment)
  Stream<QuerySnapshot> getEmployees() {
    return _firestore
        .collection('users')
        .where('role', isEqualTo: 'Employee')
        .snapshots();
  }
}
