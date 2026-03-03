import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CountdownCircleTimer } from "react-native-countdown-circle-timer";
import questionsData from "./questions.json";

type Option = {
  label: string;
  points: number;
  emoji?: string;
};

type Question = {
  id: string;
  title: string;
  subtitle: string;
  emoji?: string;
  time: number;
  bonusTime: number;
  options: Option[];
};

type QuestionsData = {
  measurable: Question[];
  hypothetical: Question[];
};

// Shuffle array function
function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const rawData = questionsData as QuestionsData;
const ALL_QUESTIONS: Question[] = [
  ...rawData.measurable,
  ...rawData.hypothetical,
];

// Circular Timer Component
type CircularTimerProps = {
  timeRemaining: number; // For external state tracking if needed
  totalTime: number; // The 'time' attribute from JSON
  bonusTime: number; // The 'bonusTime' attribute
  isLowTime: boolean; // Derived state: totalTime - elapsed < 3 (or 30%)
  questionId: string; // Used as the 'key' to reset the timer on new questions
};

function CircularTimer({
  timeRemaining,
  totalTime,
  bonusTime,
  isLowTime,
  questionId,
}: CircularTimerProps) {
  // Logic to determine color based on Aura states
  // Bonus zone: solid yellow until bonus time runs out
  // After bonus: gradient between two custom colors
  const BONUS_COLOR = "#b6b300"; // Solid yellow during bonus
  const START_COLOR = "#2fff3d"; // Blue (at end of bonus)
  const END_COLOR = "#FF3B30"; // Red (at time 0)

  const colors = [BONUS_COLOR, BONUS_COLOR, START_COLOR, END_COLOR];
  const colorsTime = [totalTime, totalTime - bonusTime, totalTime - bonusTime, 0];

  return (
    <View style={styles.timerContainer}>
      <CountdownCircleTimer
        key={questionId}
        isPlaying={timeRemaining > 0}
        duration={totalTime}
        colors={colors}
        colorsTime={colorsTime}
        size={120}
        strokeWidth={8}
        trailColor="#222"
        onComplete={() => {
          return { shouldRepeat: false };
        }}
      >
        {({ remainingTime, color }) => (
          <View style={styles.timerTextContainer}>
            <Text style={[styles.timerTimeText, { color }]}>
              {remainingTime}
            </Text>
            {remainingTime > totalTime - bonusTime && (
              <Text style={styles.timerBonusLabel}>BONUS</Text>
            )}
          </View>
        )}
      </CountdownCircleTimer>
    </View>
  );
}

function getAuraTier(score: number) {
  if (score >= 2000) {
    return {
      title: "Ethereal / Mythic Being",
      message: "You've transcended. Your energy is unmatched.",
    };
  }

  if (score >= 1000) {
    return {
      title: "High Aura / Main Character",
      message: "You're radiating excellence. Keep this level up.",
    };
  }

  if (score >= 500) {
    return {
      title: "Solid Vibe / Locked In",
      message: "You're on the right path. Stay consistent.",
    };
  }

  if (score >= 0) {
    return {
      title: "Average Citizen / Potential NPC",
      message: "You have potential. Time to level up.",
    };
  }

  if (score >= -500) {
    return {
      title: "Aura Debt / Crashing Out",
      message: "Warning: Your energy is draining fast. Turn it around now.",
    };
  }

  return {
    title: "Infinite Aura Loss / Rebirth Needed",
    message: "Full reset required. Start fresh, one choice at a time.",
  };
}

export default function Index() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPoints, setSelectedPoints] = useState<Record<string, number>>({});
  const [questionOptionShuffles] = useState<Record<string, Option[]>>(() => {
    // Pre-shuffle all options for each question
    const shuffles: Record<string, Option[]> = {};
    ALL_QUESTIONS.forEach((q) => {
      shuffles[q.id] = shuffleArray(q.options);
    });
    return shuffles;
  });

  const [timeRemaining, setTimeRemaining] = useState(ALL_QUESTIONS[0].time);
  const shakeAnimRef = useRef(new Animated.Value(0)).current;
  const glitchColorRef = useRef(new Animated.Value(0)).current;

  const currentQuestion = ALL_QUESTIONS[currentStep];
  const totalQuestionTime = currentQuestion?.time || 0;
  const bonusTime = currentQuestion?.bonusTime || 0;

  // Initialize timer when question changes
  useEffect(() => {
    setTimeRemaining(totalQuestionTime);
    shakeAnimRef.setValue(0);
    glitchColorRef.setValue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, totalQuestionTime]);

  // Timer countdown effect
  useEffect(() => {
    if (timeRemaining <= 0) {
      // Time's up - auto advance
      if (currentStep < ALL_QUESTIONS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = Math.max(0, prev - 0.1);
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [timeRemaining, currentStep]);

  // Shake effect when time is low
  useEffect(() => {
    const isLowTime = timeRemaining / totalQuestionTime < 0.3;

    if (isLowTime && timeRemaining > 0) {
      const shakeSequence = Animated.sequence([
        Animated.timing(shakeAnimRef, {
          toValue: 5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimRef, {
          toValue: -5,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimRef, {
          toValue: 3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimRef, {
          toValue: -3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimRef, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]);

      shakeSequence.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, totalQuestionTime]);

  // Glitch effect for color
  useEffect(() => {
    const isLowTime = timeRemaining / totalQuestionTime < 0.3;

    if (isLowTime && timeRemaining > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glitchColorRef, {
            toValue: 1,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(glitchColorRef, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, totalQuestionTime]);

  const answeredCount = Object.keys(selectedPoints).length;
  const progress = (currentStep + 1) / ALL_QUESTIONS.length;
  const progressPercent = Math.round(progress * 100);
  const isFinished = answeredCount === ALL_QUESTIONS.length || currentStep >= ALL_QUESTIONS.length;

  // Determine current section
  const currentSection =
    currentQuestion.id.startsWith("M") ? "Measurable" : "Hypothetical";
  const measurableCount = rawData.measurable.length;

  const finalScore = useMemo(() => {
    return Object.values(selectedPoints).reduce(
      (total, points) => total + points,
      0,
    );
  }, [selectedPoints]);

  const auraTier = getAuraTier(finalScore);

  const selectOption = (points: number) => {
    // Apply 1.5x multiplier if answer selected during bonus time
    const isInBonusTime = timeRemaining > totalQuestionTime - bonusTime;
    const finalPoints = isInBonusTime ? Math.round(points * 1.5) : points;
    
    setSelectedPoints((prev) => ({
      ...prev,
      [currentQuestion.id]: finalPoints,
    }));
    // Auto-advance to next question
    if (currentStep < ALL_QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const restart = () => {
    setSelectedPoints({});
    setCurrentStep(0);
  };

  const isLowTime = timeRemaining / totalQuestionTime < 0.3;
  const shakeTransform = {
    transform: [{ translateX: shakeAnimRef }],
  };

  const glitchOpacity = glitchColorRef.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.5],
  });

  if (isFinished) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.resultHeader}>Your AURA Result</Text>
          <View style={styles.resultCard}>
            <Text style={styles.score}>{finalScore}</Text>
            <Text style={styles.tier}>{auraTier.title}</Text>
            <Text style={styles.message}>{auraTier.message}</Text>
          </View>

          <Pressable style={styles.primaryButton} onPress={restart}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayedOptions = questionOptionShuffles[currentQuestion.id];

  return (
    <Animated.View style={[{ flex: 1 }, isLowTime && shakeTransform]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <Text style={styles.header}>AURA Calculator</Text>
          <CircularTimer
            timeRemaining={timeRemaining}
            totalTime={totalQuestionTime}
            bonusTime={bonusTime}
            isLowTime={isLowTime}
            questionId={currentQuestion.id}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.sectionBanner}>
            <Text style={styles.sectionText}>
              Section {currentStep >= measurableCount ? "2" : "1"}: {currentSection}
            </Text>
            <Text style={styles.sectionDescription}>
              {currentSection === "Measurable"
                ? "Part 1: Current Stats and Habits"
                : "Part 2: Decision-Making"}
            </Text>
          </View>
          <Text style={styles.subHeader}>
            {currentSection === "Measurable"
              ? "Part 1: Current Stats and Habits"
              : "Part 2: Decision-Making"}
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>

          <Text style={styles.stepText}>
            Question {currentStep + 1} of {ALL_QUESTIONS.length} · {progressPercent}% complete
          </Text>

          <View style={styles.card}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionTitle}>
                {currentQuestion.emoji} {currentQuestion.title}
              </Text>
            </View>
            <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text>

            {displayedOptions.map((option) => {
              const isSelected = selectedPoints[currentQuestion.id] === option.points;

              return (
                <Pressable
                  key={option.label}
                  onPress={() => selectOption(option.points)}
                  style={[styles.option, isSelected && styles.optionSelected]}
                >
                  <Animated.Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                      isLowTime && { opacity: glitchOpacity },
                    ]}
                  >
                    {option.emoji} {option.label}
                  </Animated.Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
    width: "100%",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#0F172A",
    position: "relative",
    minHeight: 60,
    width: "100%",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignSelf: "center",
    width: "100%",
    maxWidth: 600,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignSelf: "center",
    width: "100%",
    maxWidth: 600,
  },
  header: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "800",
    position: "absolute",
    left: 20,
    top: "50%",
    transform: [{ translateY: -12 }],
  },
  resultHeader: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 24,
    textAlign: "center",
  },
  timerContainer: {
    position: "absolute",
    right: 20,
    top: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 120,
    height: 120,
  },
  timerTextContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  timerTimeText: {
    fontSize: 32,
    fontWeight: "900",
    fontFamily: "System",
  },
  timerBonusLabel: {
    fontSize: 10,
    color: "#FFD700",
    fontWeight: "bold",
    position: "absolute",
    bottom: -15,
    letterSpacing: 1,
  },
  sectionBanner: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#67E8F9",
  },
  sectionText: {
    color: "#67E8F9",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionDescription: {
    color: "#CBD5E1",
    fontSize: 14,
  },
  subHeader: {
    color: "#CBD5E1",
    textAlign: "center",
    marginBottom: 20,
    fontSize: 15,
  },
  progressTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "#1E293B",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22D3EE",
    borderRadius: 999,
  },
  stepText: {
    color: "#94A3B8",
    textAlign: "right",
    marginBottom: 20,
    fontWeight: "600",
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  backButton: {
    padding: 6,
    marginRight: -8,
  },
  backButtonText: {
    color: "#67E8F9",
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  questionTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
    flex: 1,
  },
  questionSubtitle: {
    color: "#94A3B8",
    marginBottom: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#0F172A",
  },
  optionSelected: {
    borderColor: "#22D3EE",
    backgroundColor: "#083344",
  },
  optionText: {
    color: "#E2E8F0",
    fontWeight: "600",
  },
  optionTextSelected: {
    color: "#67E8F9",
  },

  resultCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  score: {
    color: "#67E8F9",
    fontSize: 64,
    fontWeight: "900",
    lineHeight: 74,
  },
  outOf: {
    color: "#94A3B8",
    marginBottom: 12,
  },
  tier: {
    color: "#F8FAFC",
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    color: "#CBD5E1",
    textAlign: "center",
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: "#22D3EE",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 16,
  },
});
