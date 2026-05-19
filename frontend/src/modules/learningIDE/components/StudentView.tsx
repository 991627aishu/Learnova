import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, Clock, User } from 'lucide-react';

interface ResourceContent {
  id: string;
  courseId: string;
  latexContent: string;
  compiledHtml: string;
  updatedAt: string;
}

interface ResourceCourse {
  id: string;
  title: string;
  description?: string;
  instructorId: string;
  instructor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  content?: ResourceContent;
}

export default function StudentView() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<ResourceCourse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableOfContents, setTableOfContents] = useState<Array<{ id: string; title: string; level: number }>>([]);

  useEffect(() => {
    if (!courseId) {
      navigate('/resources');
      return;
    }

    loadCourse();
  }, [courseId, navigate]);

  const loadCourse = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/resources/courses/${courseId}`);
      if (!response.ok) {
        throw new Error('Course not found');
      }

      const courseData: ResourceCourse = await response.json();
      setCourse(courseData);

      // Generate table of contents from HTML content
      if (courseData.content?.compiledHtml) {
        generateTableOfContents(courseData.content.compiledHtml);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTableOfContents = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const toc: Array<{ id: string; title: string; level: number }> = [];
    
    headings.forEach((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;
      toc.push({
        id,
        title: heading.textContent || '',
        level: parseInt(heading.tagName.charAt(1)),
      });
    });
    
    setTableOfContents(toc);
  };

  const scrollToHeading = (headingId: string) => {
    const element = document.getElementById(headingId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600">{error || 'Course not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/resources')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Resources</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-semibold text-gray-900">{course.title}</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>{course.instructor.firstName} {course.instructor.lastName}</span>
              </div>
              {course.content && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Updated {new Date(course.content.updatedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Table of Contents */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Table of Contents</h3>
              {tableOfContents.length > 0 ? (
                <nav className="space-y-2">
                  {tableOfContents.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToHeading(item.id)}
                      className={`block w-full text-left hover:text-blue-600 transition-colors ${
                        item.level === 1 ? 'font-semibold' : 
                        item.level === 2 ? 'pl-4 font-medium' : 
                        item.level === 3 ? 'pl-8 text-sm' : 'pl-12 text-sm'
                      } text-gray-700`}
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>
              ) : (
                <p className="text-gray-500 text-sm">No sections available</p>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              {/* Course Description */}
              {course.description && (
                <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-gray-700">{course.description}</p>
                </div>
              )}

              {/* Content */}
              {course.content?.compiledHtml ? (
                <div 
                  className="prose prose-lg max-w-none text-gray-900"
                  dangerouslySetInnerHTML={{ __html: course.content.compiledHtml }}
                />
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Content Coming Soon</h3>
                  <p className="text-gray-600">The instructor is still working on this content. Check back later!</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
