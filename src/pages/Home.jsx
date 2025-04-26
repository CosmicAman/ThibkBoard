import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Home.css';

const Home = ({ setCurrentPage }) => {
  const { user } = useAuth();
  
  useEffect(() => {
    document.title = 'ThinkBoard - Your Learning Companion';
  }, []);

  const handleGetStarted = () => {
    if (!user) {
      setCurrentPage('signup');
    } else {
      setCurrentPage('notes');
    }
  };

  const handleLearnMore = () => {
    // Scroll to features section
    const featuresSection = document.querySelector('.features-section');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreDashboard = () => {
    setCurrentPage('notes');
  };

  const handleFeatureClick = (page) => {
    if (!user) {
      setCurrentPage('signup');
    } else {
      setCurrentPage(page);
    }
  };

  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Elevate Your Learning with ThinkBoard</h1>
          <p className="hero-subtitle">The comprehensive platform for knowledge management and collaborative productivity</p>
          {!user && (
            <div className="cta-buttons">
              <button className="primary-btn large" onClick={handleGetStarted}>Start Your Journey</button>
              <button className="secondary-btn" onClick={handleLearnMore}>Discover Features</button>
            </div>
          )}
          {user && (
            <div className="cta-buttons">
              <button className="primary-btn large" onClick={handleExploreDashboard}>Access Dashboard</button>
            </div>
          )}
        </div>
      </section>

      <section className="features-section">
        <h2>Powerful Tools for Learning and Collaboration</h2>
        <div className="features-grid">
          <div className="feature-card" onClick={() => handleFeatureClick('notes')}>
            <div className="feature-icon">📝</div>
            <h3>Smart Notes</h3>
            <p>Organize your thoughts with our powerful note-taking system. Tag, search, and categorize your notes effortlessly.</p>
          </div>
          
          <div className="feature-card" onClick={() => handleFeatureClick('quizzes')}>
            <div className="feature-icon">🧠</div>
            <h3>Interactive Quizzes</h3>
            <p>Test your knowledge and reinforce learning with customizable quizzes and flashcards.</p>
          </div>
          
          <div className="feature-card" onClick={() => handleFeatureClick('whiteboard')}>
            <div className="feature-icon">🖌️</div>
            <h3>Digital Whiteboard</h3>
            <p>Visualize concepts and brainstorm ideas with our intuitive whiteboard tool.</p>
          </div>
          
          <div className="feature-card" onClick={() => handleFeatureClick('community')}>
            <div className="feature-icon">👥</div>
            <h3>Community</h3>
            <p>Connect with other learners, share resources, and collaborate on projects.</p>
          </div>
          
          <div className="feature-card" onClick={() => handleFeatureClick('playground')}>
            <div className="feature-icon">💻</div>
            <h3>Code Playground</h3>
            <p>Practice coding with our interactive playground supporting multiple programming languages.</p>
          </div>
          
          <div className="feature-card" onClick={() => handleFeatureClick('chat')}>
            <div className="feature-icon">💬</div>
            <h3>Friend Chat</h3>
            <p>Message directly with classmates and friends to collaborate on projects or just stay connected.</p>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>How ThinkBoard Works</h2>
        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Create an Account</h3>
            <p>Sign up for free and set up your personal learning space.</p>
          </div>
          
          <div className="step">
            <div className="step-number">2</div>
            <h3>Choose Your Tools</h3>
            <p>Select from our suite of learning and productivity tools.</p>
          </div>
          
          <div className="step">
            <div className="step-number">3</div>
            <h3>Learn & Collaborate</h3>
            <p>Take notes, create quizzes, use the whiteboard, and connect with others.</p>
          </div>
          
          <div className="step">
            <div className="step-number">4</div>
            <h3>Track Progress</h3>
            <p>Monitor your learning journey and see your improvement over time.</p>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <h2>What Our Users Say</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <p>"ThinkBoard has completely transformed how I study. The note organization and quiz features are game-changers!"</p>
            <div className="testimonial-author">- Sarah K., Student</div>
          </div>
          
          <div className="testimonial-card">
            <p>"As a teacher, I love using ThinkBoard to create interactive learning materials for my students. The whiteboard tool is exceptional."</p>
            <div className="testimonial-author">- Michael T., Educator</div>
          </div>
          
          <div className="testimonial-card">
            <p>"The code playground has helped me practice programming concepts in a convenient environment. Highly recommended!"</p>
            <div className="testimonial-author">- Alex R., Developer</div>
          </div>
        </div>
      </section>

      <section className="developer-section">
        <div className="developer-content">
          <div className="developer-photo">
            <img 
              src="./aman.jpeg" 
              alt="Developer" 
              className="developer-image"
            />
          </div>
          <div className="developer-message">
            <h2>From the Developer</h2>
            <p className="developer-quote">
              "I created ThinkBoard with a vision to revolutionize the way we learn and collaborate. 
              As someone who's passionate about education and technology, I wanted to build a platform 
              that combines the best of both worlds. ThinkBoard is more than just a tool - it's a 
              community where learners can grow together, share knowledge, and achieve their goals."
            </p>
            <div className="developer-signature">
              <p className="developer-name">Aman Singh</p>
              <p className="developer-title">Lead Developer</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Enhance Your Learning</h2>
        <p>Join thousands of students, educators, and professionals who use ThinkBoard every day.</p>
        {!user ? (
          <button className="primary-btn large" onClick={handleGetStarted}>Get Started for Free</button>
        ) : (
          <button className="primary-btn large" onClick={handleExploreDashboard}>Explore Your Dashboard</button>
        )}
      </section>
    </div>
  );
};

export default Home;