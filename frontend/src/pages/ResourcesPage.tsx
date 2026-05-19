import React, { useState, useEffect } from 'react';
import { BookOpen, Edit3, User, GraduationCap, ArrowRight, Clock, Plus, X, Save, Eye } from 'lucide-react';
import { useUserStore } from '@/store/userStore';
import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Course {
  id: string;
  title: string;
  description: string;
  content_raw: string;   // LaTeX editor content
  content_html: string;  // compiled HTML output
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// Storage functions for per-course persistence
const saveCourse = (course: Course) => {
  const STORAGE_KEY = `course_${course.id}`;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(course));
  
  // Also update the courses list
  const savedCourses = localStorage.getItem('learning-courses');
  const courses = savedCourses ? JSON.parse(savedCourses) : [];
  const updatedCourses = courses.map((c: Course) => c.id === course.id ? course : c);
  localStorage.setItem('learning-courses', JSON.stringify(updatedCourses));
};

const loadCourse = (courseId: string): Course | null => {
  const data = localStorage.getItem(`course_${courseId}`);
  return data ? JSON.parse(data) : null;
};

export default function ResourcesPage() {
  const { user } = useUserStore();
  const [viewMode, setViewMode] = useState<'instructor' | 'student'>(
    user?.role === 'instructor' || user?.role === 'admin' ? 'instructor' : 'student'
  );
  const [currentView, setCurrentView] = useState<'landing' | 'create' | 'editor' | 'view'>('landing');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // PROPER STATE MODEL: Separate editing and compiled content
  const [content, setContent] = useState('');
  const [compiledHtml, setCompiledHtml] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Safe rendering guard
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600">Please log in to access resources</p>
        </div>
      </div>
    );
  }

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  // Load courses from localStorage on mount
  useEffect(() => {
    const savedCourses = localStorage.getItem('learning-courses');
    if (savedCourses) {
      try {
        setCourses(JSON.parse(savedCourses));
      } catch (e) {
        console.error('Error loading courses:', e);
      }
    }
  }, []);

  // Load state correctly when course is selected
  useEffect(() => {
    if (selectedCourse) {
      const saved = loadCourse(selectedCourse.id);
      if (saved) {
        setContent(saved.content_raw || '');
        setCompiledHtml(saved.content_html || '');
        setIsPublished(saved.published || false);
        setSelectedCourse(saved);
      } else {
        setContent(selectedCourse.content_raw || '');
        setCompiledHtml(selectedCourse.content_html || '');
        setIsPublished(selectedCourse.published || false);
      }
    }
  }, [selectedCourse?.id]);

  const handleCreateCourse = () => {
    if (!newCourse?.title?.trim()) return;

    const course: Course = {
      id: Date.now().toString(),
      title: newCourse.title,
      description: newCourse.description,
      content_raw: '',
      content_html: '',
      published: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedCourses = [...courses, course];
    setCourses(updatedCourses);
    localStorage.setItem('learning-courses', JSON.stringify(updatedCourses));
    
    setSelectedCourse(course);
    setNewCourse({ title: '', description: '' });
    setShowCreateForm(false);
    setCurrentView('editor');
  };

  const handleCourseSelect = (course: Course) => {
    // Load individual course data to ensure we have latest
    const savedCourse = loadCourse(course.id);
    const courseData = savedCourse || course;
    
    setSelectedCourse(courseData);
    if (viewMode === 'instructor' && isInstructor) {
      setCurrentView('editor');
    } else {
      // Student mode - show compiled HTML content
      setCurrentView('view');
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    // DO NOT auto-compile - only save raw content
    if (selectedCourse) {
      const updatedCourse = {
        ...selectedCourse,
        content_raw: newContent,
        updatedAt: new Date().toISOString()
      };
      saveCourse(updatedCourse);
      setCourses(prev => prev.map(c => c.id === selectedCourse.id ? updatedCourse : c));
    }
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    setSelectedCourse(null);
    setContent('');
    setCompiledHtml('');
    setIsPublished(false);
  };

  // Real LaTeX to HTML compilation with KaTeX
  const compileLatex = (latex: string) => {
    try {
      // First, process LaTeX blocks
      let processedContent = latex;
      
      // Extract and process block math ($$...$$)
      const blockMathRegex = /\$\$(.*?)\$\$/gs;
      const blockMathMatches: Array<{original: string, rendered: string}> = [];
      let match;
      while ((match = blockMathRegex.exec(latex)) !== null) {
        const mathContent = match[1].trim();
        try {
          const renderedMath = katex.renderToString(mathContent, {
            displayMode: true,
            throwOnError: false
          });
          blockMathMatches.push({
            original: match[0],
            rendered: renderedMath
          });
        } catch (e) {
          blockMathMatches.push({
            original: match[0],
            rendered: `<div class="text-red-500">Math Error: ${mathContent}</div>`
          });
        }
      }
      
      // Extract and process inline math ($...$)
      const inlineMathRegex = /\$(.*?)\$/g;
      const inlineMathMatches: Array<{original: string, rendered: string}> = [];
      while ((match = inlineMathRegex.exec(latex)) !== null) {
        const mathContent = match[1].trim();
        try {
          const renderedMath = katex.renderToString(mathContent, {
            displayMode: false,
            throwOnError: false
          });
          inlineMathMatches.push({
            original: match[0],
            rendered: renderedMath
          });
        } catch (e) {
          inlineMathMatches.push({
            original: match[0],
            rendered: `<span class="text-red-500">Math Error: ${mathContent}</span>`
          });
        }
      }
      
      // Replace LaTeX with placeholders
      processedContent = processedContent.replace(blockMathRegex, 'BLOCK_MATH_PLACEHOLDER');
      processedContent = processedContent.replace(inlineMathRegex, 'INLINE_MATH_PLACEHOLDER');
      
      // Convert markdown to HTML (synchronous version)
      let html = marked.parse(processedContent, {
        breaks: true,
        gfm: true
      });
      
      // Ensure html is a string
      if (typeof html !== 'string') {
        html = String(html);
      }
      
      // Replace placeholders with rendered math
      let finalHtml = html;
      let blockIndex = 0;
      let inlineIndex = 0;
      
      finalHtml = finalHtml.replace(/BLOCK_MATH_PLACEHOLDER/g, () => {
        return blockMathMatches[blockIndex++]?.rendered || '';
      });
      
      finalHtml = finalHtml.replace(/INLINE_MATH_PLACEHOLDER/g, () => {
        return inlineMathMatches[inlineIndex++]?.rendered || '';
      });
      
      return finalHtml;
    } catch (error) {
      console.error('LaTeX compilation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `<div class="text-red-500">Compilation Error: ${errorMessage}</div>`;
    }
  };

  const handleCompileAndPublish = () => {
    if (!content || content.trim() === '') {
      alert('Cannot publish empty content. Please add some content before publishing.');
      return;
    }
    
    const html = compileLatex(content);
    
    setCompiledHtml(html);
    setIsPublished(true);
    
    if (selectedCourse) {
      const updatedCourse = {
        ...selectedCourse,
        content_raw: content,
        content_html: html,
        published: true,
        updatedAt: new Date().toISOString()
      };
      
      saveCourse(updatedCourse);
      setCourses(prev => prev.map(c => c.id === selectedCourse.id ? updatedCourse : c));
      setSelectedCourse(updatedCourse);
    }
  };

  // Auto-save functionality - REMOVED to prevent conflicts with manual save

  // Show different views based on current state
if (currentView === 'editor' && selectedCourse && viewMode === 'instructor' && isInstructor) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToLanding}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Resources
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedCourse.title}</h2>
              <p className="text-sm text-gray-600">{selectedCourse.description}</p>
              {isPublished && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                  <Eye className="w-3 h-3 mr-1" />
                  Published
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCompileAndPublish}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Compile & Publish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editor and Preview */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* LaTeX Editor */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col bg-white">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">LaTeX Editor</h3>
            <p className="text-sm text-gray-500">Auto-saves every 2 seconds • Use $...$ for inline math, $$...$$ for block math</p>
          </div>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="flex-1 w-full p-4 font-mono text-sm text-gray-900 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={`# Welcome to LaTeX Editor

## Getting Started

Write your **LaTeX** and Markdown content here.

### Example Content

The quadratic equation is:
$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

Inline math: $E = mc^2$

\`\`\`python
def hello_world():
    print("Hello, World!")
    return True
\`\`\`

- First item
- Second item
- Third item

This is a **paragraph** with *italic* and \`code\` elements.

### More Math Examples

Integral:
$$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$

Sum:
$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$

Matrix:
$$\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}$$`}
            spellCheck={false}
          />
        </div>

        {/* HTML Preview */}
        <div className="w-1/2 flex flex-col bg-white">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Live Preview</h3>
            <p className="text-sm text-green-600">Real-time KaTeX rendering</p>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {compiledHtml ? (
              <div 
                className="prose prose-lg max-w-none text-gray-900"
                dangerouslySetInnerHTML={{ 
                  __html: compiledHtml 
                }}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold mb-2">No compiled content yet</h3>
                <p>Click "Compile & Publish" to see the preview.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Student View - Clean HTML rendering
if (currentView === 'view' && selectedCourse && (viewMode === 'student' || !isInstructor)) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToLanding}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Resources
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{selectedCourse.title}</h2>
              <p className="text-sm text-gray-600">{selectedCourse.description}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Content Viewer */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-8">
            {selectedCourse.content_html && selectedCourse.content_html.trim() !== '' ? (
              <div 
                className="prose prose-lg max-w-none text-gray-900 [&>pre]:bg-gray-900 [&>pre]:text-gray-100 [&>pre]:p-4 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>code]:bg-gray-100 [&>code]:text-gray-800 [&>code]:px-2 [&>code]:py-1 [&>code]:rounded [&>code]:text-sm [&>pre>code]:bg-transparent [&>pre>code]:text-gray-100 [&>pre>code]:px-0 [&>pre>code]:py-0"
                dangerouslySetInnerHTML={{ 
                  __html: selectedCourse.content_html 
                }}
              />
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Content Not Published Yet</h3>
                <p className="text-gray-600">This course hasn't been published with content yet. Check back later.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Safety fallback - if somehow a student gets to editor view, redirect to student view
if (currentView === 'editor' && selectedCourse && (viewMode === 'student' || !isInstructor)) {
  setCurrentView('view');
}

return (
    <div className="min-h-screen px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">
          Free Learning Resources
        </h1>

        <p className="text-muted-foreground text-center mb-8 text-lg">
          Explore interactive tutorials and documentation to enhance your learning experience.
        </p>

        {/* Role Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            {isInstructor && (
              <button
                onClick={() => setViewMode('instructor')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                  viewMode === 'instructor'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Instructor Mode</span>
              </button>
            )}
            <button
              onClick={() => setViewMode('student')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                viewMode === 'student'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Student Mode</span>
            </button>
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'instructor' && isInstructor ? (
          /* Instructor Mode Content */
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Instructor Dashboard</h2>
                  <p className="mb-6 text-blue-100">
                    Create and manage learning resources with LaTeX-powered content and real-time compilation.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="flex items-center space-x-2 px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit3 className="w-5 h-5" />
                      <span>Create Course</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <GraduationCap className="w-32 h-32 text-white/20" />
                </div>
              </div>
            </div>

            {/* Create Course Form */}
            {showCreateForm && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Create New Course</h3>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Title
                    </label>
                    <input
                      type="text"
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Mathematics Fundamentals"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newCourse.description}
                      onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Brief description of the course content..."
                    />
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleCreateCourse}
                      disabled={!newCourse.title.trim()}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Course</span>
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Course List */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Courses</h3>
              {courses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No courses created yet</p>
                  <p className="text-sm">Click "Create Course" to get started</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => handleCourseSelect(course)}
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                    >
                      <h4 className="font-semibold text-gray-900">{course.title}</h4>
                      <p className="text-gray-600 text-sm mt-1">{course.description}</p>
                      <p className="text-xs text-gray-500 mt-2">Updated {new Date(course.updatedAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Student Mode Content */
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Learning Resources</h2>
                  <p className="mb-6 text-green-100">
                    Explore interactive tutorials and documentation with LaTeX-powered mathematical content.
                  </p>
                </div>
                <div className="hidden lg:block">
                  <BookOpen className="w-32 h-32 text-white/20" />
                </div>
              </div>
            </div>

            {/* Course Cards - Only show published courses */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.filter(course => course.published).length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Published Courses Available</h3>
                  <p className="text-gray-600">Check back later for new learning content</p>
                </div>
              ) : (
                courses.filter(course => course.published).map((course) => (
                  <div
                    key={course.id}
                    onClick={() => handleCourseSelect(course)}
                    className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center mb-4">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{course.title}</h3>
                    <p className="text-gray-600 mb-4">{course.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>Updated {new Date(course.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Access Information for non-instructors in instructor mode */}
        {viewMode === 'instructor' && !isInstructor && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-amber-800 mb-2">Instructor Access Required</h3>
            <p className="text-amber-700 mb-4">
              To create and edit learning content, you need instructor or admin privileges. 
              Contact your administrator to get access to instructor tools.
            </p>
            <div className="flex items-center space-x-4 text-sm text-amber-600">
              <span>Current role: {user?.role || 'guest'}</span>
              <span>•</span>
              <span>Required: instructor or admin</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
