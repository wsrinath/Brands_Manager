class UserModel {
  final String id;
  final String email;
  final String role;
  final String name;

  UserModel({
    required this.id,
    required this.email,
    required this.role,
    required this.name,
  });

  factory UserModel.fromMap(Map<String, dynamic> data, String id) {
    return UserModel(
      id: id,
      email: data['email'] ?? '',
      role: data['role'] ?? 'Employee',
      name: data['name'] ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'email': email,
      'role': role,
      'name': name,
    };
  }
}
