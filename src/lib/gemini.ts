export interface Quiz {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Module {
  id: string;
  title: string;
  content: string;
  quiz: Quiz;
}

export interface Course {
  title: string;
  description: string;
  modules: Module[];
}

export async function generateCourse(topic: string, language: string = 'English'): Promise<Course> {
  const response = await fetch('/api/generate-course', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ topic, language }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate course: ${response.statusText}`);
  }

  return response.json();
}
