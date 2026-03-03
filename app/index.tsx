import { useMemo, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Option = {
  label: string;
  points: number;
};

type Question = {
  id: string;
  title: string;
  subtitle: string;
  options: Option[];
};

const QUESTIONS: Question[] = [
  // --- DISCIPLINE & DOPAMINE (The Foundation) ---
  {
    id: "r1",
    title: "The Morning Phone Grapple",
    subtitle: "What happened in the first 10 minutes after you woke up today?",
    options: [
      { label: "Immediately scrolled social media", points: -50 },
      { label: "Checked only essential notifications", points: 10 },
      { label: "Didn't touch it; got straight to my routine", points: 60 }
    ]
  },
  {
    id: "r2",
    title: "The Dopamine Loop",
    subtitle: "How many hours of 'brain rot' / short-form video did you consume yesterday?",
    options: [
      { label: "Zero. I’m locked in.", points: 70 },
      { label: "Under an hour (Healthy balance)", points: 20 },
      { label: "I lost track of time/3+ hours", points: -60 }
    ]
  },
  {
    id: "r3",
    title: "Delayed Gratification",
    subtitle: "Did you eat something today solely because you were bored, not hungry?",
    options: [
      { label: "Yes, I folded immediately", points: -30 },
      { label: "I thought about it, but resisted", points: 40 },
      { label: "No, I only eat with intent", points: 50 }
    ]
  },

  // --- PHYSICAL PRESENCE & SELF-RESPECT ---
  {
    id: "r4",
    title: "Current Posture Check",
    subtitle: "Be honest. How are you sitting/standing right this second?",
    options: [
      { label: "Slumped over like a shrimp", points: -40 },
      { label: "Relaxed but upright", points: 30 },
      { label: "Shoulders back, chest out, peak form", points: 60 }
    ]
  },
  {
    id: "r5",
    title: "The Mirror Test",
    subtitle: "When you looked in the mirror this morning, what was the first thought?",
    options: [
      { label: " 'I need to fix up' (Self-criticism)", points: -10 },
      { label: " 'Let’s get to work' (Neutral/Focused)", points: 30 },
      { label: " 'I am the main character' (Confidence)", points: 60 }
    ]
  },
  {
    id: "r6",
    title: "Eye Contact Reality",
    subtitle: "The last time you walked past a stranger today, did you look up?",
    options: [
      { label: "I stared at the ground until they passed", points: -30 },
      { label: "I gave a slight, respectful nod", points: 50 },
      { label: "I didn't even notice them (True focus)", points: 40 }
    ]
  },

  // --- ACCOUNTABILITY & CONSISTENCY ---
  {
    id: "r7",
    title: "The 'To-Do' Debt",
    subtitle: "How many tasks are you currently procrastinating on?",
    options: [
      { label: "None. My plate is clean.", points: 80 },
      { label: "Maybe one or two small things", points: 10 },
      { label: "I am drowning in 'I'll do it tomorrow'", points: -70 }
    ]
  },
  {
    id: "r8",
    title: "Promises Kept",
    subtitle: "Did you keep the last promise you made to yourself?",
    options: [
      { label: "Yes, without fail", points: 100 },
      { label: "I tried, but slipped up", points: 0 },
      { label: "I've already forgotten what it was", points: -50 }
    ]
  },
  {
    id: "r9",
    title: "Ownership",
    subtitle: "When something went wrong this week, who did you blame first?",
    options: [
      { label: "Myself (I own the outcome)", points: 60 },
      { label: "The circumstances/bad luck", points: -20 },
      { label: "Someone else entirely", points: -80 }
    ]
  },

  // --- SOCIAL AWARENESS & INDEPENDENCE ---
  {
    id: "r10",
    title: "The Validation Hunger",
    subtitle: "When was the last time you posted something just to see who would 'like' it?",
    options: [
      { label: "In the last 24 hours", points: -40 },
      { label: "I haven't posted in weeks/months", points: 50 },
      { label: "I don't care about the likes", points: 70 }
    ]
  },
  {
    id: "r11",
    title: "The Ghosting Response",
    subtitle: "Someone you value hasn't replied to your last text for 2 days. What are you doing?",
    options: [
      { label: "Checking their 'last seen' every hour", points: -100 },
      { label: "Living my life; I barely noticed", points: 90 },
      { label: "Thinking of a 'funny' follow-up to get attention", points: -20 }
    ]
  },
  {
    id: "r12",
    title: "Privacy vs. Publicity",
    subtitle: "Do people on your social media know exactly what you’re doing right now?",
    options: [
      { label: "Yes, I posted a story about it", points: -30 },
      { label: "No, I move in silence", points: 60 }
    ]
  },

  // --- EMOTIONAL CONTROL & RESILIENCE ---
  {
    id: "r13",
    title: "The Last Argument",
    subtitle: "Think of your last disagreement. How did it end?",
    options: [
      { label: "I lost my cool and crashed out", points: -80 },
      { label: "I explained my side and moved on", points: 40 },
      { label: "I stayed calm while they got mad", points: 100 }
    ]
  },
  {
    id: "r14",
    title: "The Gossip Trap",
    subtitle: "Have you spoken negatively about someone who wasn't in the room today?",
    options: [
      { label: "Yes, it felt good in the moment", points: -60 },
      { label: "No, I don't engage in that", points: 70 },
      { label: "Only to solve a specific problem", points: 10 }
    ]
  },

  // --- PURPOSE & DIRECTION ---
  {
    id: "r15",
    title: "The Weekend Vibe",
    subtitle: "What did you actually accomplish this past weekend?",
    options: [
      { label: "Worked on a skill/hobby/fitness", points: 60 },
      { label: "Recovered from the week (Rest)", points: 20 },
      { label: "Just killed time until Monday", points: -40 }
    ]
  },
  {
    id: "r16",
    title: "The 5-Year Vision",
    subtitle: "Do you know exactly where you want to be in 5 years?",
    options: [
      { label: "I have a detailed plan", points: 80 },
      { label: "I have a vague idea", points: 20 },
      { label: "I’m just winging it day by day", points: -50 }
    ]
  },

  // --- AUTHENTICITY & INTEGRITY ---
  {
    id: "r17",
    title: "People Pleasing",
    subtitle: "Did you say 'yes' to something today that you actually wanted to say 'no' to?",
    options: [
      { label: "Yes, I didn't want to be rude", points: -50 },
      { label: "No, I set my boundary", points: 70 },
      { label: "I didn't have to choose today", points: 0 }
    ]
  },
  {
    id: "r18",
    title: "The Mask",
    subtitle: "Are you acting differently right now because of who is around you?",
    options: [
      { label: "Yes, I'm playing a character", points: -60 },
      { label: "Slightly, for professional reasons", points: 10 },
      { label: "No, I am the same everywhere", points: 80 }
    ]
  },

  // --- COMPETENCE & SKILL MASTERY ---
  {
    id: "r19",
    title: "The Skill Grind",
    subtitle: "When was the last time you practiced a difficult skill?",
    options: [
      { label: "Within the last 24 hours", points: 70 },
      { label: "Sometime this week", points: 30 },
      { label: "I can't remember", points: -40 }
    ]
  },
  {
    id: "r20",
    title: "Reading Habits",
    subtitle: "How many pages of a non-fiction book did you read today?",
    options: [
      { label: "10+ pages (Expanding the mind)", points: 50 },
      { label: "Zero. I don't read books.", points: -20 },
      { label: "I listened to a podcast instead", points: 20 }
    ]
  },

  // --- INDEPENDENCE ---
  {
    id: "r21",
    title: "The Opinion Weight",
    subtitle: "If a stranger criticized your outfit right now, how much would it ruin your day?",
    options: [
      { label: "I'd think about it for hours", points: -70 },
      { label: "I'd be annoyed but get over it", points: -10 },
      { label: "I wouldn't care at all", points: 90 }
    ]
  },
  {
    id: "r22",
    title: "Alone Time",
    subtitle: "Can you sit in a room for 15 minutes without any music, phone, or TV?",
    options: [
      { label: "Easy. I do it often.", points: 60 },
      { label: "I'd get restless/bored", points: -20 },
      { label: "I need background noise at all times", points: -50 }
    ]
  },

  // --- SOCIAL AWARENESS ---
  {
    id: "r23",
    title: "The Listener",
    subtitle: "In your last conversation, did you listen or just wait for your turn to speak?",
    options: [
      { label: "I listened and asked questions", points: 60 },
      { label: "I was mostly waiting to talk", points: -20 },
      { label: "I dominated the whole talk", points: -40 }
    ]
  },

  // --- VICTIM MINDSET VS. RESILIENCE ---
  {
    id: "r24",
    title: "The 'Life is Unfair' Test",
    subtitle: "How often do you feel like the world is 'out to get you'?",
    options: [
      { label: "All the time. I'm unlucky.", points: -90 },
      { label: "Sometimes, when things get hard", points: -10 },
      { label: "Never. I create my own luck.", points: 100 }
    ]
  },

  // --- CLEANLINESS & SELF-RESPECT ---
  {
    id: "r25",
    title: "The Living Space",
    subtitle: "Look at your room/desk right now. Is it clean?",
    options: [
      { label: "Spotless. Order is power.", points: 50 },
      { label: "A little messy, but manageable", points: 10 },
      { label: "It's a disaster zone", points: -60 }
    ]
  },

  // --- DECISIVENESS ---
  {
    id: "r26",
    title: "The Dinner Choice",
    subtitle: "How long does it take you to pick what to eat at a restaurant?",
    options: [
      { label: "Under 30 seconds (Decisive)", points: 50 },
      { label: "I wait to see what others get", points: -30 },
      { label: "I agonize over the menu", points: -10 }
    ]
  },

  // --- JEALOUSY ---
  {
    id: "r27",
    title: "The Peer Success",
    subtitle: "A friend just got a massive 'win'. What was your internal reaction?",
    options: [
      { label: "Pure joy for them", points: 70 },
      { label: "Hidden jealousy/bitterness", points: -80 },
      { label: "A mix of both", points: 0 }
    ]
  },

  // --- KINDNESS WITH BACKBONE ---
  {
    id: "r28",
    title: "The Service Worker",
    subtitle: "How did you treat the last waiter/cashier you interacted with?",
    options: [
      { label: "With respect and a smile", points: 40 },
      { label: "I ignored them/didn't say thanks", points: -50 },
      { label: "I was polite but firm when they messed up", points: 60 }
    ]
  },

  // --- ADDICTION ---
  {
    id: "r29",
    title: "The Ghost Vibration",
    subtitle: "Do you ever think your phone vibrated when it actually didn't?",
    options: [
      { label: "Yes, all the time", points: -40 },
      { label: "Rarely", points: 20 },
      { label: "Never", points: 50 }
    ]
  },

  // --- HUMILITY ---
  {
    id: "r30",
    title: "The 'I Don't Know'",
    subtitle: "When you don't understand something in a group, do you admit it?",
    options: [
      { label: "Yes, I ask for clarification", points: 60 },
      { label: "No, I pretend to understand", points: -50 },
      { label: "I stay silent and Google it later", points: 10 }
    ]
  },

  // --- CONSISTENCY ---
  {
    id: "r31",
    title: "The Gym/Hobby Streak",
    subtitle: "Did you stick to your physical or mental training this week?",
    options: [
      { label: "Every single day", points: 90 },
      { label: "Most days", points: 30 },
      { label: "I haven't started yet", points: -40 }
    ]
  },

  // --- THE FINAL BOSS: PURPOSE ---
  {
    id: "r32",
    title: "The Deathbed Perspective",
    subtitle: "If today was your last day, would you be proud of your recent actions?",
    options: [
      { label: "Absolutely", points: 150 },
      { label: "Not really, I've been wasting time", points: -100 },
      { label: "I'm on the right path, but not there yet", points: 50 }
    ]
  },
  // --- SUBSTANCE CONTROL ---
  {
    id: "r33",
    title: "The Air Quality Check",
    subtitle: "Do you currently rely on a vape or cigarettes to 'get through' the day?",
    options: [
      { label: "Clean lungs. I don't touch that.", points: 100 },
      { label: "Socially/Occasionally", points: -20 },
      { label: "I'm a slave to the flavored air (-1000 aura)", points: -150 }
    ]
  },
  {
    id: "r34",
    title: "The Liquid Courage",
    subtitle: "When was the last time you 'needed' a drink to feel comfortable in a social setting?",
    options: [
      { label: "Never. I am the vibe myself.", points: 80 },
      { label: "Once or twice lately", points: -10 },
      { label: "Every single time I go out", points: -60 }
    ]
  },
  
  // --- DOPAMINE & BRAIN FOG ---
  {
    id: "r35",
    title: "The Pixels vs. Reality",
    subtitle: "Have you consumed adult content/porn in the last 48 hours?",
    options: [
      { label: "No. I'm retaining my energy.", points: 120 },
      { label: "Yes, I folded", points: -100 },
      { label: "It's a daily habit I can't break", points: -250 }
    ]
  },

  // --- SOBRIETY & CLARITY ---
  {
    id: "r36",
    title: "The Mental Fog",
    subtitle: "Are you currently 'under the influence' of any recreational drugs?",
    options: [
      { label: "No. My mind is 100% sharp.", points: 100 },
      { label: "Just a little bit right now", points: -50 },
      { label: "I'm rarely sober these days", points: -200 }
    ]
  }
];

function getAuraTier(score: number) {
  if (score >= 85) {
    return {
      title: "Legendary AURA",
      message: "Your habits and character are creating powerful, positive energy.",
    };
  }

  if (score >= 65) {
    return {
      title: "Strong AURA",
      message: "You are doing many things right. Keep sharpening your consistency.",
    };
  }

  if (score >= 45) {
    return {
      title: "Rising AURA",
      message: "You have a solid base. Focus on one weak area to level up quickly.",
    };
  }

  return {
    title: "Rebuild Mode",
    message: "A reset is possible. Start with one better choice each day.",
  };
}

export default function Index() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPoints, setSelectedPoints] = useState<Record<string, number>>({});

  const currentQuestion = QUESTIONS[currentStep];
  const answeredCount = Object.keys(selectedPoints).length;
  const progress = answeredCount / QUESTIONS.length;
  const progressPercent = Math.round(progress * 100);
  const canMoveNext = selectedPoints[currentQuestion.id] !== undefined;
  const isFinished = answeredCount === QUESTIONS.length;

  const finalScore = useMemo(() => {
    const sum = Object.values(selectedPoints).reduce(
      (total, points) => total + points,
      0,
    );
    const max = QUESTIONS.length * 10;
    return Math.round((sum / max) * 100);
  }, [selectedPoints]);

  const auraTier = getAuraTier(finalScore);

  const selectOption = (points: number) => {
    setSelectedPoints((prev) => ({
      ...prev,
      [currentQuestion.id]: points,
    }));
  };

  const goNext = () => {
    if (currentStep < QUESTIONS.length - 1) {
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

  if (isFinished) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.header}>Your AURA Result</Text>
          <View style={styles.resultCard}>
            <Text style={styles.score}>{finalScore}</Text>
            <Text style={styles.outOf}>out of 100</Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>AURA Calculator</Text>
        <Text style={styles.subHeader}>Rate yourself and reveal your current energy score.</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        <Text style={styles.stepText}>
          Question {currentStep + 1} of {QUESTIONS.length} · {progressPercent}% complete
        </Text>

        <View style={styles.card}>
          <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
          <Text style={styles.questionSubtitle}>{currentQuestion.subtitle}</Text>

          {currentQuestion.options.map((option) => {
            const isSelected = selectedPoints[currentQuestion.id] === option.points;

            return (
              <Pressable
                key={option.label}
                onPress={() => selectOption(option.points)}
                style={[styles.option, isSelected && styles.optionSelected]}
              >
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footerButtons}>
          <Pressable
            onPress={goBack}
            style={[styles.secondaryButton, currentStep === 0 && styles.buttonDisabled]}
            disabled={currentStep === 0}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </Pressable>

          <Pressable
            onPress={goNext}
            style={[styles.primaryButton, !canMoveNext && styles.buttonDisabled]}
            disabled={!canMoveNext}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  header: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
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
  footerButtons: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#06B6D4",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#082F49",
    fontWeight: "800",
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#334155",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#E2E8F0",
    fontWeight: "700",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
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
});
