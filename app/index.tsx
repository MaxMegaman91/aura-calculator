import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  Easing,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CountdownCircleTimer } from "react-native-countdown-circle-timer";
import Svg, { Circle } from "react-native-svg";
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

const TRANSITION_FADE_OUT_MS = 260;
const TRANSITION_BREATHING_GAP_MS = 220;
const TRANSITION_REFILL_EXTRA_MS = 500;
const TRANSITION_HOLD_MS =
  TRANSITION_BREATHING_GAP_MS + TRANSITION_REFILL_EXTRA_MS;
const TRANSITION_FADE_IN_MS = 320;
const TIMER_SYNC_INTERVAL_MS = 100;
const VIGNETTE_EDGE_COLOR = "rgba(120, 36, 36, 0.2)";

// Circular Timer Component
type CircularTimerProps = {
  timeRemaining: number; // For external state tracking if needed
  totalTime: number; // The 'time' attribute from JSON
  bonusTime: number; // The 'bonusTime' attribute
  isLowTime: boolean; // Derived state: totalTime - elapsed < 3 (or 30%)
  questionId: string; // Used as the 'key' to reset the timer on new questions
  duration?: number;
  initialRemainingTime?: number;
  isPlaying?: boolean;
  isGrowing?: boolean;
  mode?: "countdown" | "refill";
  displayTimeRemaining?: number;
  refillStartFraction?: number;
  refillStartValue?: number;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RefillTimerProps = {
  totalTime: number;
  duration: number;
  startFraction: number;
  startValue: number;
  questionId: string;
};

function RefillTimer({
  totalTime,
  duration,
  startFraction,
  startValue,
  questionId,
}: RefillTimerProps) {
  const progressRef = useRef(new Animated.Value(startFraction)).current;
  const [displayValue, setDisplayValue] = useState(startValue);

  useEffect(() => {
    progressRef.stopAnimation();
    progressRef.setValue(startFraction);
    setDisplayValue(startValue);

    const listenerId = progressRef.addListener(({ value }) => {
      const normalizedProgress =
        startFraction >= 1 ? 1 : (value - startFraction) / (1 - startFraction);
      const clampedProgress = Math.max(0, Math.min(1, normalizedProgress));
      setDisplayValue(startValue + (totalTime - startValue) * clampedProgress);
    });

    const animation = Animated.timing(progressRef, {
      toValue: 1,
      duration: duration * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });

    animation.start();

    return () => {
      progressRef.removeListener(listenerId);
      progressRef.stopAnimation();
    };
  }, [duration, progressRef, questionId, startFraction, startValue, totalTime]);

  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = progressRef.interpolate({
    inputRange: [0, 1],
    outputRange: [-circumference, 0],
  });
  const refillDisplayLabel =
    displayValue >= totalTime - 0.05
      ? totalTime.toString()
      : Math.floor(displayValue).toString();

  return (
    <View style={styles.timerContainer}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#222"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2fff3d"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          originX={size / 2}
          originY={size / 2}
          rotation="-90"
        />
      </Svg>
      <View style={styles.timerOverlay} pointerEvents="none">
        <View style={styles.timerTextContainer}>
          <Text style={[styles.timerTimeText, { color: "#2fff3d" }]}>
            {refillDisplayLabel}
          </Text>
          <Text style={styles.timerBonusLabel}>REFILL</Text>
        </View>
      </View>
    </View>
  );
}

function CircularTimer({
  timeRemaining,
  totalTime,
  bonusTime,
  isLowTime,
  questionId,
  duration,
  initialRemainingTime,
  isPlaying,
  isGrowing,
  mode = "countdown",
  displayTimeRemaining,
  refillStartFraction = 0,
  refillStartValue = 0,
}: CircularTimerProps) {
  // Logic to determine color based on Aura states
  // Bonus zone: solid yellow until bonus time runs out
  // After bonus: gradient between two custom colors
  const BONUS_COLOR = "#b6b300"; // Solid yellow during bonus
  const START_COLOR = "#2fff3d"; // Blue (at end of bonus)
  const END_COLOR = "#FF3B30"; // Red (at time 0)

  const colors: [`#${string}`, `#${string}`, `#${string}`, `#${string}`] = [
    BONUS_COLOR,
    BONUS_COLOR,
    START_COLOR,
    END_COLOR,
  ];
  const colorsTime: [number, number, number, number] = [
    totalTime,
    totalTime - bonusTime,
    totalTime - bonusTime,
    0,
  ];

  if (mode === "refill") {
    return (
      <RefillTimer
        totalTime={totalTime}
        duration={duration ?? 0}
        startFraction={refillStartFraction}
        startValue={refillStartValue}
        questionId={questionId}
      />
    );
  }

  return (
    <View style={styles.timerContainer}>
      <CountdownCircleTimer
        key={questionId}
        isPlaying={isPlaying ?? timeRemaining > 0}
        duration={duration ?? totalTime}
        initialRemainingTime={initialRemainingTime}
        isGrowing={isGrowing}
        colors={colors}
        colorsTime={colorsTime}
        updateInterval={0.1}
        size={120}
        strokeWidth={8}
        trailColor="#222"
        onComplete={() => {
          return { shouldRepeat: false };
        }}
      >
        {({ remainingTime, color }) => {
          return (
            <View style={styles.timerTextContainer}>
              <Text style={[styles.timerTimeText, { color }]}>
                {Math.max(0, Math.ceil(displayTimeRemaining ?? timeRemaining))}
              </Text>
              {remainingTime > totalTime - bonusTime && (
                <Text style={styles.timerBonusLabel}>BONUS</Text>
              )}
            </View>
          );
        }}
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
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [timerMode, setTimerMode] = useState<"countdown" | "refill">("countdown");
  const [timerRenderKey, setTimerRenderKey] = useState<string>(
    `${ALL_QUESTIONS[0].id}-0`,
  );
  const [timerTotalTime, setTimerTotalTime] = useState<number>(ALL_QUESTIONS[0].time);
  const [timerBonusTime, setTimerBonusTime] = useState<number>(ALL_QUESTIONS[0].bonusTime);
  const [timerRefillDuration, setTimerRefillDuration] = useState<number>(
    (TRANSITION_HOLD_MS + TRANSITION_FADE_IN_MS) / 1000,
  );
  const [timerRefillStartFraction, setTimerRefillStartFraction] = useState(0);
  const [timerRefillStartValue, setTimerRefillStartValue] = useState(
    ALL_QUESTIONS[0].time,
  );
  const [timerInitialRemainingTime, setTimerInitialRemainingTime] = useState<number>(
    ALL_QUESTIONS[0].time,
  );
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
  const [questionStartTimeMs, setQuestionStartTimeMs] = useState(() => Date.now());
  const autoAdvancedStepRef = useRef<number | null>(null);
  const isAdvancingRef = useRef(false);
  const isMountedRef = useRef(true);
  const isAttentionActiveRef = useRef(true);
  const attentionWaitersRef = useRef<Array<() => void>>([]);
  const timerTransitionSeqRef = useRef(0);
  const transitionOpacityRef = useRef(new Animated.Value(1)).current;
  const glitchColorRef = useRef(new Animated.Value(0)).current;
  const vignetteAnimRef = useRef(new Animated.Value(0)).current;

  const wait = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });

  const animateTransitionOpacity = useCallback(
    (toValue: number, duration: number) => {
      return new Promise<void>((resolve) => {
        Animated.timing(transitionOpacityRef, {
          toValue,
          duration,
          useNativeDriver: true,
        }).start(() => resolve());
      });
    },
    [transitionOpacityRef],
  );

  const waitForAttention = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (isAttentionActiveRef.current) {
        resolve();
        return;
      }
      attentionWaitersRef.current.push(resolve);
    });
  }, []);

  const nextTimerKey = useCallback((baseKey: string) => {
    const seq = timerTransitionSeqRef.current + 1;
    timerTransitionSeqRef.current = seq;
    return `${baseKey}-${seq}`;
  }, []);

  const startCountdownForQuestion = useCallback(
    (question: Question, initialRemainingTime = question.time) => {
      setTimerMode("countdown");
      setTimerTotalTime(question.time);
      setTimerBonusTime(question.bonusTime);
      setTimerInitialRemainingTime(initialRemainingTime);
      setTimerRenderKey(nextTimerKey(question.id));
      setQuestionStartTimeMs(Date.now() - (question.time - initialRemainingTime) * 1000);
      setTimeRemaining(initialRemainingTime);
      autoAdvancedStepRef.current = null;
      glitchColorRef.setValue(0);
      vignetteAnimRef.setValue(0);
    },
    [glitchColorRef, nextTimerKey, vignetteAnimRef],
  );

  const advanceToStepWithTransition = useCallback(
    async (nextStep: number) => {
      if (nextStep > ALL_QUESTIONS.length || isAdvancingRef.current) {
        return;
      }

      const currentQuestion = ALL_QUESTIONS[currentStep];
      const nextQuestion = ALL_QUESTIONS[nextStep];
      const refillDurationSec = (TRANSITION_HOLD_MS + TRANSITION_FADE_IN_MS) / 1000;
      const currentFillFraction = currentQuestion
        ? Math.max(0, Math.min(1, timeRemaining / currentQuestion.time))
        : 0;
      const currentDisplayedTime = Math.max(0, Math.ceil(timeRemaining));

      isAdvancingRef.current = true;
      setIsTransitioning(true);

      // Phase 1: fade out the current question.
      await animateTransitionOpacity(0, TRANSITION_FADE_OUT_MS);

      // Hold the midpoint until the user is actively back on this tab/app.
      if (!isAttentionActiveRef.current) {
        await waitForAttention();
      }

      if (nextQuestion) {
        setTimerMode("refill");
        setTimerTotalTime(nextQuestion.time);
        setTimerBonusTime(nextQuestion.bonusTime);
        setTimerRenderKey(nextTimerKey(`refill-${nextQuestion.id}`));
        setTimerRefillDuration(refillDurationSec);
        setTimerRefillStartFraction(currentFillFraction);
        setTimerRefillStartValue(currentDisplayedTime);
      }

      // Small breathing gap between questions.
      await wait(TRANSITION_HOLD_MS);

      if (!isMountedRef.current) {
        return;
      }

      setCurrentStep(nextStep);
      transitionOpacityRef.setValue(0);

      // Phase 2: fade in the next question.
      await animateTransitionOpacity(1, TRANSITION_FADE_IN_MS);

      if (nextQuestion && isMountedRef.current) {
        startCountdownForQuestion(nextQuestion);
      }

      if (isMountedRef.current) {
        setIsTransitioning(false);
      }
      isAdvancingRef.current = false;
    },
    [
      TRANSITION_FADE_IN_MS,
      TRANSITION_FADE_OUT_MS,
      TRANSITION_HOLD_MS,
      animateTransitionOpacity,
      currentStep,
      nextTimerKey,
      startCountdownForQuestion,
      timeRemaining,
      waitForAttention,
      transitionOpacityRef,
    ],
  );

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      attentionWaitersRef.current.forEach((resolve) => resolve());
      attentionWaitersRef.current = [];
    };
  }, []);

  useEffect(() => {
    const applyAttentionState = (isActive: boolean) => {
      isAttentionActiveRef.current = isActive;
      if (isActive && attentionWaitersRef.current.length > 0) {
        const pending = [...attentionWaitersRef.current];
        attentionWaitersRef.current = [];
        pending.forEach((resolve) => resolve());
      }
    };

    applyAttentionState(AppState.currentState === "active");

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      const isAppActive = nextState === "active";
      const isDocumentVisible = typeof document === "undefined" ? true : !document.hidden;
      applyAttentionState(isAppActive && isDocumentVisible);
    });

    let visibilityHandler: (() => void) | undefined;
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      visibilityHandler = () => {
        const isVisible = !document.hidden;
        const isAppActive = AppState.currentState === "active";
        applyAttentionState(isVisible && isAppActive);
      };
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    return () => {
      appStateSubscription.remove();
      if (visibilityHandler && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
    };
  }, []);

  // Initialize timer when question changes
  useEffect(() => {
    const question = ALL_QUESTIONS[currentStep];
    if (question && !isTransitioning) {
      startCountdownForQuestion(question);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isTransitioning]);

  // Timer countdown effect based on wall-clock time so it stays accurate in background tabs.
  useEffect(() => {
    const question = ALL_QUESTIONS[currentStep];
    if (!question) {
      return;
    }

    const syncTimeRemaining = (shouldResyncTimer = false) => {
      const elapsedSeconds = (Date.now() - questionStartTimeMs) / 1000;
      const nextRemaining = Math.max(0, question.time - elapsedSeconds);
      setTimeRemaining(nextRemaining);

      if (shouldResyncTimer && timerMode === "countdown") {
        setTimerInitialRemainingTime(nextRemaining);
        setTimerRenderKey(nextTimerKey(question.id));
      }
    };

    syncTimeRemaining();

    const interval = setInterval(syncTimeRemaining, TIMER_SYNC_INTERVAL_MS);

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncTimeRemaining(true);
      }
    });

    let visibilityHandler: (() => void) | undefined;
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      visibilityHandler = () => {
        if (!document.hidden) {
          syncTimeRemaining(true);
        }
      };
      document.addEventListener("visibilitychange", visibilityHandler);
    }

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
      if (visibilityHandler && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
    };
  }, [currentStep, nextTimerKey, questionStartTimeMs, timerMode]);

  // Auto-advance exactly once when time reaches zero.
  useEffect(() => {
    if (timeRemaining > 0) {
      return;
    }

    if (autoAdvancedStepRef.current === currentStep) {
      return;
    }

    autoAdvancedStepRef.current = currentStep;
    void advanceToStepWithTransition(currentStep + 1);
  }, [advanceToStepWithTransition, currentStep, timeRemaining]);

  // Glitch effect for color
  useEffect(() => {
    const question = ALL_QUESTIONS[currentStep];
    if (!question) return;
    
    const isLowTime = timeRemaining / question.time < 0.3;

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
  }, [timeRemaining, currentStep]);

  // Vignette effect that closes in from edges when time is low
  useEffect(() => {
    const question = ALL_QUESTIONS[currentStep];
    if (!question) return;
    
    const isLowTime = timeRemaining / question.time < 0.3;

    if (isLowTime && timeRemaining > 0) {
      Animated.timing(vignetteAnimRef, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(vignetteAnimRef, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, currentStep]);

  const answeredCount = Object.keys(selectedPoints).length;
  const progress = Math.max(
    0,
    Math.min(1, currentStep / ALL_QUESTIONS.length),
  );
  const progressPercent = Math.round(progress * 100);
  const isFinished = answeredCount === ALL_QUESTIONS.length || currentStep >= ALL_QUESTIONS.length;

  // Calculate final score and tier (must be done before early return to maintain hook order)
  const finalScore = useMemo(() => {
    return Object.values(selectedPoints).reduce(
      (total, points) => total + points,
      0,
    );
  }, [selectedPoints]);

  const auraTier = getAuraTier(finalScore);

  const isMobileWeb =
    Platform.OS === "web" &&
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const handleShareToInstagramStory = useCallback(async () => {
    // Desktop and laptop web should route to an explicit unsupported page.
    if (Platform.OS === "web" && !isMobileWeb) {
      router.push("/not-supported");
      return;
    }

    const instagramStoryUrl = "instagram://story-camera";

    try {
      if (Platform.OS === "web") {
        await Linking.openURL(instagramStoryUrl);
        return;
      }

      const canOpenInstagram = await Linking.canOpenURL(instagramStoryUrl);
      if (!canOpenInstagram) {
        Alert.alert(
          "Instagram not available",
          "Instagram app is not installed or does not support story sharing on this device.",
        );
        return;
      }

      await Linking.openURL(instagramStoryUrl);
    } catch {
      Alert.alert(
        "Unable to open Instagram",
        "We could not open Instagram Story from this device.",
      );
    }
  }, [isMobileWeb, router]);

  const handleRetry = useCallback(() => {
    autoAdvancedStepRef.current = null;
    isAdvancingRef.current = false;
    setIsTransitioning(false);
    setSelectedPoints({});
    setCurrentStep(0);
    startCountdownForQuestion(ALL_QUESTIONS[0]);
  }, [startCountdownForQuestion]);

  // Show results page if finished
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

          <Pressable style={styles.primaryButton} onPress={handleRetry}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, styles.secondaryButton]}
            onPress={() => {
              void handleShareToInstagramStory();
            }}
          >
            <Text style={styles.secondaryButtonText}>Share: Post to Instagram Story</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Only access currentQuestion properties after we've confirmed not finished
  const currentQuestion = ALL_QUESTIONS[currentStep];
  const totalQuestionTime = currentQuestion.time;
  const bonusTime = currentQuestion.bonusTime;

  // Determine current section
  const currentSection =
    currentQuestion.id.startsWith("M") ? "Measurable" : "Hypothetical";
  const measurableCount = rawData.measurable.length;

  const selectOption = (points: number) => {
    if (isTransitioning) {
      return;
    }

    // Apply 1.5x multiplier if answer selected during bonus time
    const isInBonusTime = timeRemaining > totalQuestionTime - bonusTime;
    const finalPoints = isInBonusTime ? Math.round(points * 1.5) : points;
    
    setSelectedPoints((prev) => ({
      ...prev,
      [currentQuestion.id]: finalPoints,
    }));
    // Auto-advance to next question
    if (currentStep < ALL_QUESTIONS.length - 1) {
      void advanceToStepWithTransition(currentStep + 1);
    }
  };

  const isLowTime = timeRemaining / totalQuestionTime < 0.3;

  const glitchOpacity = glitchColorRef.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.5],
  });

  const vignetteOpacity = vignetteAnimRef.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.7],
  });

  const displayedOptions = questionOptionShuffles[currentQuestion.id];

  const effectiveTimerTotalTime = timerMode === "refill" ? timerTotalTime : totalQuestionTime;
  const effectiveTimerBonusTime = timerMode === "refill" ? timerBonusTime : bonusTime;

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.vignetteContainer,
            { opacity: vignetteOpacity },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[VIGNETTE_EDGE_COLOR, 'transparent']}
            style={styles.vignetteTop}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', VIGNETTE_EDGE_COLOR]}
            style={styles.vignetteBottom}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[VIGNETTE_EDGE_COLOR, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.vignetteSide}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', VIGNETTE_EDGE_COLOR]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.vignetteSide}
            pointerEvents="none"
          />
        </Animated.View>

        <View style={styles.headerContainer}>
          <Text style={styles.header}>AURA Calculator</Text>
          <CircularTimer
            timeRemaining={timeRemaining}
            totalTime={effectiveTimerTotalTime}
            bonusTime={effectiveTimerBonusTime}
            isLowTime={isLowTime}
            questionId={timerRenderKey}
            mode={timerMode}
            duration={timerMode === "refill" ? timerRefillDuration : totalQuestionTime}
            initialRemainingTime={timerInitialRemainingTime}
            isPlaying={timerMode === "refill" ? true : timeRemaining > 0}
            isGrowing={timerMode === "refill" ? true : undefined}
            displayTimeRemaining={timeRemaining}
            refillStartFraction={timerRefillStartFraction}
            refillStartValue={timerRefillStartValue}
          />
        </View>

        <Animated.View style={[styles.questionScene, { opacity: transitionOpacityRef }]}> 
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
                    disabled={isTransitioning}
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
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
    width: "100%",
  },
  questionScene: {
    flex: 1,
  },
  vignetteContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
  vignetteSide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
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
    minWidth: 72,
  },
  timerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  timerTimeText: {
    fontSize: 32,
    fontWeight: "900",
    fontFamily: "System",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
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
  secondaryButton: {
    marginTop: 12,
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#475569",
  },
  primaryButtonText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButtonText: {
    color: "#E2E8F0",
    fontWeight: "700",
    fontSize: 16,
  },
});
