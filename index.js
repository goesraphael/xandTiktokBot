const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");
const fetch = require("node-fetch");
const FormData = require("form-data");
const GenAI = require("@google/generative-ai");
const { TwitterApi } = require("twitter-api-v2");
const { Configuration, OpenAIApi } = require("openai");
const SECRETS = require("./SECRETS");

const twitterClient = new TwitterApi({
  appKey: SECRETS.APP_KEY,
  appSecret: SECRETS.APP_SECRET,
  accessToken: SECRETS.ACCESS_TOKEN,
  accessSecret: SECRETS.ACCESS_SECRET,
});

const genAI = new GenAI.GoogleGenerativeAI(SECRETS.GEMINI_API_KEY);
const openai = new OpenAIApi(new Configuration({ apiKey: SECRETS.OPENAI_API_KEY }));

const prompt = "Generate a terrifying, realistic horror story or creepy personal experience in under 280 characters. It must feel like a true event — disturbing, immersive, and with a strong hook. Use a casual, anonymous tone like “This happened to me…” or “I have never told anyone this.” Use short, punchy sentences. End with a chilling twist or unresolved mystery. Always include 2 to 3 strategic hashtags chosen from: #Creepy #ScaryStory #Paranormal #UrbanLegend #TwoSentenceHorror #GlitchInTheMatrix #ShortHorror #SpookyAI #Creepypasta #CreepyThread. Optimize for virality, curiosity, and late-night reads. Never mention AI or fiction. Stories must feel raw, unexplained, and personal.Generate a viral short horror story in English that feels 100% real, formatted like a first-person confession or “this happened to me” thread, starting with a shocking hook, using short, punchy sentences to build suspense with mystery, paranoia, or the supernatural, ending with a disturbing, unresolved twist, under 280 characters, no dialogue, no setup — just fear, fast, never saying its fiction, never using AI references, never explaining, adding 2 to 3 high-impact hashtags from #ScaryStory #TwoSentenceHorror #CreepyThread #ShortHorror #Creepypasta #GlitchInTheMatrix #UrbanLegend #Paranormal #SpookyAI #TrueHorror #CreepyStories #CreepyAF #ScaryContent #RealHorror #CursedPost #DarkContent #ThisReallyHappened #RealParanormal #IRememberEverything #ItWasReal #NotMadeUp #TrueStoryThread #ShortScaryStory #MiniHorror #FlashFiction #QuickTerror #DarkBite #NightTweet #LiminalSpace #Backrooms #AnalogHorror #Uncanny #WeirdCore #HorrorVibes #AIGenerated #AIPost #AIHorror #BotTellsStories #SyntheticTerror #StoryTime #ReadThis #WTFDidIJustRead #ScrollStopper #TwitterFiction, optimized for virality, psychological impact, SEO for horror hashtags, late-night readers, and emotional resonance (fear, confusion, curiosity), with a casual, anonymous, haunted tone like “I’ve never told anyone this before,” using example formats like “I woke up to a voicemail from myself, screaming,” “My son said grandma tucked him in last night, she died 6 years ago,” or “The police found footage of me sleeping, I live alone, no cameras,” staying human, scary, and real.";

async function main() {
  const geminiText = await generateTextWithGemini(prompt);
  await sendTweet(geminiText);

  const gptScript = await generateScriptWithChatGPT(prompt);
  const imageUrl = await generateImage(gptScript);
  const imagePath = "generated_image.png";
  await downloadImage(imageUrl, imagePath);
  const audioPath = "audio.mp3";
  await generateTTS(gptScript, audioPath);
  const videoPath = "video.mp4";
  createVideoWithFFmpeg(imagePath, audioPath, videoPath);
  await uploadToTikTok(videoPath, gptScript);
}

main();

async function generateTextWithGemini(prompt) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro", generationConfig: { maxOutputTokens: 400 } });
  const result = await model.generateContent(prompt);
  return (await result.response).text();
}

async function generateScriptWithChatGPT(prompt) {
  const res = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  return res.data.choices[0].message.content;
}

async function generateImage(prompt) {
  const res = await openai.createImage({ prompt, n: 1, size: "1024x1024" });
  return res.data.data[0].url;
}

async function downloadImage(url, outputPath) {
  const response = await fetch(url);
  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
}

async function generateTTS(text, outputPath) {
  const res = await openai.createSpeech({
    model: "tts-1",
    input: text,
    voice: "onyx",
    response_format: "mp3",
  });
  fs.writeFileSync(outputPath, Buffer.from(await res.data));
}

function createVideoWithFFmpeg(imagePath, audioPath, outputPath) {
  execSync(`ffmpeg -y -loop 1 -i ${imagePath} -i ${audioPath} -c:v libx264 -tune stillimage -t 60 -pix_fmt yuv420p -vf "zoompan=z='min(zoom+0.0005,1.5)':d=125" -shortest ${outputPath}`);
}

async function sendTweet(text) {
  try {
    await twitterClient.v2.tweet(text);
    console.log("✅ Tweet enviado!");
  } catch (e) {
    console.error("❌ Erro ao postar no Twitter:", e);
  }
}

async function uploadToTikTok(videoPath, caption) {
  const form = new FormData();
  form.append("video", fs.createReadStream(videoPath));
  form.append("caption", caption.slice(0, 150));

  try {
    const response = await fetch("https://open.tiktokapis.com/v2/post/publish/video/", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SECRETS.TIKTOK_ACCESS_TOKEN}`,
        ...form.getHeaders()
      },
      body: form
    });

    const result = await response.json();

    if (response.ok) {
      console.log("🎉 Vídeo postado no TikTok com sucesso!");
      console.log("📹 Video ID:", result.data.video_id);
    } else {
      console.error("❌ Erro ao postar no TikTok:", result);
    }
  } catch (err) {
    console.error("🚨 Falha na requisição ao TikTok:", err);
  }
}
