import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, ArrowRight, CheckCircle2, XCircle, Trophy, Loader2, BrainCircuit, Globe, Star, Flame, Award, Crown, Download, Lock, Share2, LogOut, LogIn, ShoppingBag } from 'lucide-react';
import { generateCourse, Course, Module } from './lib/gemini';
import confetti from 'canvas-confetti';
import { toPng } from 'html-to-image';
import { auth, db, googleProvider, githubProvider, discordProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const LANGUAGES = ['English', 'Hindi (हिंदी)', 'Spanish (Español)', 'French (Français)', 'German (Deutsch)', 'Japanese (日本語)', 'Arabic (العربية)'];

function MainApp() {
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('Hindi (हिंदी)');
  const [userName, setUserName] = useState(() => localStorage.getItem('skillspark_username') || '');
  const [isPremium, setIsPremium] = useState(() => localStorage.getItem('skillspark_premium') === 'true');
  const [dailyGenerations, setDailyGenerations] = useState(() => parseInt(localStorage.getItem('skillspark_daily_gen') || '0'));
  const [lastGenDate, setLastGenDate] = useState(() => localStorage.getItem('skillspark_last_gen_date') || new Date().toDateString());
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [utrError, setUtrError] = useState('');
  
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem('skillspark_xp') || '0'));
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('skillspark_streak') || '1'));
  const [isLoading, setIsLoading] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [quizState, setQuizState] = useState<'idle' | 'answered'>('idle');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [activeTab, setActiveTab] = useState<'learn' | 'marketplace'>('learn');

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => setShowLoginModal(true);
  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, googleProvider); setShowLoginModal(false); } catch (error) { console.error("Google Login failed", error); } };
  const handleLogout = async () => { try { await signOut(auth); setUser(null); } catch (error) { console.error("Logout failed", error); } };

  useEffect(() => {
    localStorage.setItem('skillspark_xp', xp.toString());
    localStorage.setItem('skillspark_username', userName);
  }, [xp, userName]);

  useEffect(() => {
    const today = new Date().toDateString();
    if (lastGenDate !== today) {
      setDailyGenerations(0);
      setLastGenDate(today);
      localStorage.setItem('skillspark_daily_gen', '0');
      localStorage.setItem('skillspark_last_gen_date', today);
    }
  }, [lastGenDate]);

  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const levelProgress = xp === 0 ? 0 : ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  const phonePeUpiId = "8619835019@ibl";
  const upiAmount = "99.00";
  const upiLink = `upi://pay?pa=${phonePeUpiId}&pn=SkillSpark%20Premium&am=${upiAmount}&cu=INR&tn=Premium%20Upgrade`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  const handleVerifyPayment = () => {
    if (utrNumber.length < 12) {
      setUtrError('Please enter a valid 12-digit UTR / Reference Number.');
      return;
    }
    setUtrError('');
    setIsVerifying(true);
    setTimeout(async () => {
      setIsVerifying(false);
      setIsPremium(true);
      localStorage.setItem('skillspark_premium', 'true');
      setShowPremiumModal(false);
      setPaymentStep(false);
      setUtrNumber('');
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }, 2500);
  };

  const handleDownload = async () => {
    const certElement = document.getElementById('certificate');
    if (!certElement) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      const dataUrl = await toPng(certElement, { pixelRatio: 2, backgroundColor: '#ffffff', style: { margin: '0' } });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `SkillSpark-Certificate-${userName.replace(/\s+/g, '-') || 'Learner'}.png`;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('Error downloading certificate:', err);
      alert('Failed to download certificate. Please try again.');
    }
  };

  const handleShare = async () => {
    const shareText = `I just completed a course on "${course?.title}" and earned a certificate on SkillSpark AI! 🎓✨`;
    const shareUrl = window.location.origin;
    if (navigator.share) {
      try { await navigator.share({ title: 'My SkillSpark AI Certificate', text: shareText, url: shareUrl }); } catch (error: any) { console.error('Error sharing:', error); }
    } else {
      try { await navigator.clipboard.writeText(`${shareText} Check it out here: ${shareUrl}`); alert('Share link copied to clipboard!'); } catch (error) { console.error('Failed to copy:', error); }
    }
  };

  const handleGenerateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    const today = new Date().toDateString();
    let currentGen = dailyGenerations;
    if (lastGenDate !== today) {
      currentGen = 0;
      setDailyGenerations(0);
      setLastGenDate(today);
    }

    if (!isPremium && currentGen >= 2) {
      setShowPremiumModal(true);
      return;
    }

    setIsLoading(true);
    setCourse(null);
    setCurrentModuleIndex(0);
    setCourseCompleted(false);
    setQuizState('idle');
    setSelectedAnswer(null);

    try {
      const generatedCourse = await generateCourse(topic, language);
      setCourse(generatedCourse);
      const newGenCount = currentGen + 1;
      setDailyGenerations(newGenCount);
      localStorage.setItem('skillspark_daily_gen', newGenCount.toString());
      localStorage.setItem('skillspark_last_gen_date', today);
    } catch (error: any) {
      console.error("Course generation failed:", error);
      alert(`Oops! Something went wrong: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (quizState === 'answered') return;
    setSelectedAnswer(index);
    setQuizState('answered');
    if (course && index === course.modules[currentModuleIndex].quiz.correctAnswerIndex) {
      const newXp = xp + 50;
      setXp(newXp);
    }
  };

  const handleNextModule = () => {
    if (!course) return;
    if (currentModuleIndex < course.modules.length - 1) {
      setCurrentModuleIndex(prev => prev + 1);
      setQuizState('idle');
      setSelectedAnswer(null);
    } else {
      setCourseCompleted(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#2563eb', '#3b82f6', '#f59e0b', '#10b981'] });
      setStreak(prev => {
        const newStreak = prev + 1;
        localStorage.setItem('skillspark_streak', newStreak.toString());
        return newStreak;
      });
    }
  };

  const resetApp = () => {
    setCourse(null);
    setTopic('');
    setCourseCompleted(false);
    setCurrentModuleIndex(0);
    setQuizState('idle');
    setSelectedAnswer(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-600 cursor-pointer" onClick={resetApp}>
            <BrainCircuit className="w-6 h-6" />
            <span className="font-display font-bold text-xl tracking-tight hidden sm:inline-block">SkillSpark AI</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-800 transition-colors">
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-bold text-sm">
              <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
              {streak}
            </div>
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-bold text-sm">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              {xp} XP
            </div>
          </div>
        </div>
        {course && !courseCompleted && (
          <div className="w-full h-1.5 bg-slate-100">
            <motion.div className="h-full bg-brand-500" initial={{ width: 0 }} animate={{ width: `${((currentModuleIndex) / course.modules.length) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>
        )}
      </header>

      <main className="flex-1 w-full pb-24">
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          <AnimatePresence mode="wait">
            {!course && !isLoading && (
              <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center text-center mt-10 md:mt-20">
                <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-5 mb-10 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-xl">{level}</div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-slate-900">Level {level} Learner</div>
                      <div className="text-xs text-slate-500 mb-1">{xp} / {xpForNextLevel} XP to next level</div>
                      <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${levelProgress}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center border-l border-slate-100 pl-5">
                    <Flame className="w-6 h-6 text-orange-500 fill-orange-500 mb-1" />
                    <div className="text-sm font-bold text-slate-900">{streak} Day</div>
                    <div className="text-xs text-slate-500">Streak</div>
                  </div>
                </div>

                <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
                  What do you want to <br className="hidden md:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">learn today?</span>
                </h1>
                <p className="text-lg text-slate-600 mb-10 max-w-xl">
                  Enter any topic, and our AI will instantly generate a personalized, bite-sized course with interactive quizzes.
                </p>

                <form onSubmit={handleGenerateCourse} className="w-full max-w-lg flex flex-col gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4">
                    <div>
                      <label className="block text-left text-sm font-bold text-slate-700 mb-1 ml-2">Your Name (For Certificate)</label>
                      <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g., Rahul Kumar" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-all" required />
                    </div>
                    <div className="relative">
                      <label className="block text-left text-sm font-bold text-slate-700 mb-1 ml-2">What do you want to learn?</label>
                      <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Share Market, Python, English Grammar..." className="w-full pl-4 pr-14 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:border-brand-500 focus:bg-white transition-all" required />
                      <button type="submit" disabled={!topic.trim() || !userName.trim()} className="absolute right-2 bottom-2 top-8 aspect-square bg-brand-600 text-white rounded-lg flex items-center justify-center hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                    {!isPremium && (
                      <div className="text-sm font-medium text-slate-500 flex items-center justify-between px-2">
                        <span>Free courses today: {dailyGenerations}/2</span>
                        {dailyGenerations >= 2 && <span className="text-red-500 flex items-center gap-1"><Lock className="w-3 h-3"/> Limit Reached</span>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-slate-600 bg-white border border-slate-200 rounded-full px-4 py-2 w-fit mx-auto shadow-sm">
                    <Globe className="w-4 h-4" />
                    <span className="text-sm font-medium">Language:</span>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-transparent text-sm font-bold text-brand-600 focus:outline-none cursor-pointer">
                      {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                  </div>
                </form>
              </motion.div>
            )}

            {isLoading && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-6" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Crafting your course...</h2>
                <p className="text-slate-500">Our AI is gathering the best information on "{topic}"</p>
              </motion.div>
            )}

            {course && !courseCompleted && (
              <motion.div key="course" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 mb-3">{course.title}</h1>
                  <p className="text-slate-600 text-lg">{course.description}</p>
                </div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 md:p-10 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold">{currentModuleIndex + 1}</div>
                      <h2 className="text-2xl font-bold text-slate-800">{course.modules[currentModuleIndex].title}</h2>
                    </div>
                    <div className="prose prose-slate prose-lg max-w-none">
                      {course.modules[currentModuleIndex].content.split('\n\n').map((paragraph, i) => (
                        <p key={i} className="mb-4 text-slate-700 leading-relaxed">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 md:p-10 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><BookOpen className="w-5 h-5 text-brand-600" /> Knowledge Check</h3>
                    <p className="text-slate-800 font-medium mb-6 text-lg">{course.modules[currentModuleIndex].quiz.question}</p>
                    <div className="space-y-3">
                      {course.modules[currentModuleIndex].quiz.options.map((option, index) => {
                        const isCorrect = index === course.modules[currentModuleIndex].quiz.correctAnswerIndex;
                        const isSelected = index === selectedAnswer;
                        let buttonClass = "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ";
                        if (quizState === 'idle') buttonClass += "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50";
                        else if (isCorrect) buttonClass += "border-green-500 bg-green-50 text-green-900";
                        else if (isSelected && !isCorrect) buttonClass += "border-red-500 bg-red-50 text-red-900";
                        else buttonClass += "border-slate-200 bg-white opacity-50";
                        return (
                          <button key={index} onClick={() => handleAnswerSelect(index)} disabled={quizState === 'answered'} className={buttonClass}>
                            <span className="font-medium">{option}</span>
                            {quizState === 'answered' && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                            {quizState === 'answered' && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                          </button>
                        );
                      })}
                    </div>
                    <AnimatePresence>
                      {quizState === 'answered' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-6 border-t border-slate-200">
                          <div className={`p-4 rounded-xl mb-6 ${selectedAnswer === course.modules[currentModuleIndex].quiz.correctAnswerIndex ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                            <p className="font-bold mb-1">{selectedAnswer === course.modules[currentModuleIndex].quiz.correctAnswerIndex ? 'Correct!' : 'Not quite.'}</p>
                            <p>{course.modules[currentModuleIndex].quiz.explanation}</p>
                          </div>
                          <button onClick={handleNextModule} className="w-full py-4 bg-brand-600 text-white rounded-xl font-bold text-lg hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                            {currentModuleIndex < course.modules.length - 1 ? 'Continue to Next Module' : 'Finish Course'}
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {courseCompleted && course && (
              <motion.div key="completed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full">
                <div className="flex flex-col items-center text-center py-10 bg-white rounded-3xl shadow-sm border border-slate-200 px-6 w-full mb-8">
                  <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-6"><Trophy className="w-10 h-10" /></div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-4">Course Completed!</h2>
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-3 rounded-2xl flex items-center gap-3 font-bold text-lg">
                    <Star className="w-6 h-6 fill-amber-500 text-amber-500" /> Total XP Earned: {xp}
                  </div>
                </div>

                <div id="certificate" className="w-full max-w-2xl bg-white bg-gradient-to-br from-white to-amber-50/50 border-[8px] sm:border-[16px] border-double border-slate-200 p-4 sm:p-8 md:p-12 rounded-xl shadow-lg relative overflow-hidden text-center">
                  <div className="absolute top-0 left-0 w-full h-3 bg-brand-600"></div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4 sm:mb-6 mt-2 sm:mt-4">Certificate of Completion</h2>
                  <p className="text-slate-500 mb-3 sm:mb-4 uppercase tracking-widest text-[10px] sm:text-sm font-bold">This is proudly presented to</p>
                  <h1 className="text-2xl sm:text-3xl md:text-5xl font-signature text-brand-700 mb-4 border-b border-slate-300 pb-2 inline-block px-2 sm:px-8 md:px-16 capitalize whitespace-nowrap">{userName || 'Dedicated Learner'}</h1>
                  <p className="text-slate-600 mb-8 md:mb-12 max-w-md mx-auto text-sm md:text-lg leading-relaxed">
                    For successfully completing the professional certification program in <br/>
                    <span className="font-bold text-slate-900 text-lg md:text-2xl mt-2 block">"{course.title}"</span>
                  </p>
                  <div className="flex justify-between items-end mt-6 sm:mt-8 md:mt-12 pt-2 sm:pt-4 gap-1 sm:gap-2">
                    <div className="text-center flex-1">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm md:text-lg mb-1">{new Date().toLocaleDateString()}</p>
                      <div className="border-t border-slate-300 pt-1"><p className="text-[6px] sm:text-[8px] md:text-xs text-slate-500 uppercase tracking-wider font-bold">Date Completed</p></div>
                    </div>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 relative flex items-center justify-center shrink-0">
                      <Award className="w-8 h-8 sm:w-10 sm:h-10 md:w-16 md:h-16 text-amber-500 relative z-10" />
                    </div>
                    <div className="text-center flex-1">
                      <p className="font-signature text-brand-800 text-base sm:text-xl md:text-4xl whitespace-nowrap mb-1">SkillSpark AI</p>
                      <div className="border-t border-slate-300 pt-1"><p className="text-[6px] sm:text-[8px] md:text-xs text-slate-500 uppercase tracking-wider font-bold">Authorized Signature</p></div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <button onClick={handleDownload} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-full font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"><Download className="w-5 h-5" /> Download</button>
                  <button onClick={handleShare} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-full font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2"><Share2 className="w-5 h-5" /> Share</button>
                  <button onClick={resetApp} className="px-8 py-3 bg-brand-600 text-white rounded-full font-bold hover:bg-brand-700 transition-colors shadow-sm">Learn Something New</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl mx-auto flex justify-around items-center p-2">
          <button onClick={() => setActiveTab('learn')} className={`flex flex-col items-center justify-center w-full py-2 rounded-xl transition-colors ${activeTab === 'learn' ? 'text-brand-600 bg-brand-50' : 'text-slate-500 hover:bg-slate-50'}`}>
            <BookOpen className="w-6 h-6 mb-1" />
            <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">Learn with AI</span>
          </button>
          <button onClick={() => setShowPremiumModal(true)} className="flex flex-col items-center justify-center w-full py-2 rounded-xl transition-colors text-amber-500 hover:bg-amber-50">
            <Crown className="w-6 h-6 mb-1" />
            <span className="text-[10px] sm:text-xs font-bold text-center leading-tight">Premium</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showPremiumModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
              {!paymentStep ? (
                <>
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-300 to-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"><Crown className="w-8 h-8" /></div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Unlock Premium</h2>
                  <p className="text-slate-600 mb-6">You've reached your daily limit of 2 free courses. Upgrade to Premium for unlimited learning!</p>
                  <div className="bg-slate-50 rounded-2xl p-6 mb-6 border border-slate-200">
                    <div className="text-4xl font-bold text-slate-900 mb-1">₹99<span className="text-lg text-slate-500 font-normal">/month</span></div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setShowPremiumModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Later</button>
                    <button onClick={() => setPaymentStep(true)} className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-colors shadow-md">Upgrade Now</button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Complete Payment</h2>
                  <p className="text-slate-600 mb-6">Scan the QR code or click the button below to pay ₹99 via any UPI app.</p>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 inline-block">
                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-48 h-48 mx-auto rounded-lg mix-blend-multiply" />
                    <p className="mt-3 font-mono text-sm font-bold text-slate-700">{phonePeUpiId}</p>
                  </div>
                  <div className="mb-6 text-left">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Enter 12-digit UTR / Reference No.</label>
                    <input type="text" value={utrNumber} onChange={(e) => { setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12)); setUtrError(''); }} placeholder="e.g. 312345678901" className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all font-mono" />
                    {utrError && <p className="text-red-500 text-xs mt-2 font-medium">{utrError}</p>}
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={handleVerifyPayment} disabled={isVerifying || utrNumber.length < 12} className="w-full py-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2">
                      {isVerifying ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying Payment...</> : <><CheckCircle2 className="w-5 h-5" /> Verify Payment</>}
                    </button>
                    <button onClick={() => { setPaymentStep(false); setUtrNumber(''); setUtrError(''); }} className="text-sm font-bold text-slate-500 hover:text-slate-700 mt-2">Go Back</button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return <MainApp />;
}
