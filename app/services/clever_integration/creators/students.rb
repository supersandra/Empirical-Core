module CleverIntegration::Creators::Students

  def self.run(parsed_students_response)
    students = parsed_students_response.map do |parsed_student_response|
      student = self.create_student(parsed_student_response)
      student
    end
    students
  end

  private

  def self.create_student(parsed_student_response)
    puts "Creating Clever Student: #{parsed_student_response[:clever_id]}"
    student = User.find_or_initialize_by(clever_id: parsed_student_response[:clever_id])
    student.update({
      name: parsed_student_response[:name],
      username: parsed_student_response[:username],
      email: parsed_student_response[:email],
      role: 'student'
    })
    if student.errors.any?
      puts "Clever Student"
      puts student.attributes
      puts student.errors.first
      student.update({
        name: parsed_student_response[:name],
        username: parsed_student_response[:username],
        email: nil,
        role: 'student'
      })
    end
    if student.errors.any?
      puts "Clever Student"
      puts student.attributes
      puts student.errors.first
      student.update({
        name: parsed_student_response[:name],
        username: nil,
        email: parsed_student_response[:email],
        role: 'student'
      })
    end
    student.reload
  end
end
