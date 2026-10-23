// الإملاء: تسجيل واحد حتى الإيقاف، ثم طلب واحد إلى Gemini يُكتب نصه في
// الحقل وهو يصل. منقول من لوحة المفاتيح العربية (Dictation.kt وAiClient.kt
// وRecorder.kt) بقواعدها نفسها:
//  - تسجيل واحد وطلب واحد: النموذج يسمع كل جملة كاملة، فلا تنقطع عند نفَس
//    ولا يُكتب اسم بإملاءين.
//  - النص يمضي إلى الأمام فقط: يُكتب وهو يصل ولا يُستبدل ولا يُسحب.
//  - لا يُرسل تسجيل بلا صوت: النموذج إن سُلّم صمتًا كتب جملة على أي حال.
// هذا مستند خفي (offscreen) لأن عامل الخدمة لا يصل إلى الميكروفون.

const SAMPLE_RATE = 16000;
const FRAME_MS = 20;
const FRAME_SAMPLES = (SAMPLE_RATE * FRAME_MS) / 1000;

// وقفة حتى هذا الطول تبقى كاملة: هي علامة ترقيم.
const PAUSE_KEEP_MS = 800;
// ما يُبقى من صمت طويل قبل عودة الكلام حتى لا يضيع أول المقطع.
const LEAD_MS = 300;
// ميكروفون تُرك مفتوحًا سهوًا كان سيرفع الصوت طوال اليوم.
const SAFETY_LIMIT_MS = 10 * 60 * 1000;
// مستوى الغرفة هو أهدأ إطار في الثواني الأخيرة: الكلام فيه فجوات بين
// الكلمات دائمًا، فيُعرف الهدوء حتى أثناء كلام متصل.
const FLOOR_WINDOW_MS = 3000;
const MIN_VOICE_RMS = 250;
const VOICE_OVER_FLOOR = 2.5;
const METER_FLOOR_DB = -46;
const METER_TOP_DB = -9;
// أقل من هذا نقرة أو نفَس؛ حتى «لا» أطول منه.
const MIN_SPEECH_MS = 250;

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
// الاستماع يحتاج نموذجًا يسمع جيدًا أكثر من نموذج سريع: نماذج lite هي التي
// كانت تكتب كلمات لم تُقل. النموذج الذي نجح آخر مرة يأتي أولًا.
const MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash-lite"];
const MAX_TRIES = 2;
const THINKING_LEVELS = ["minimal", "low"];
// الطلب الواحد يحمل الصوت داخله، وللواجهة حد لحجمه.
const INLINE_LIMIT_BYTES = 14 * 1024 * 1024;
const IDLE_TIMEOUT_MS = 60000;

const NOTHING_HEARD = "ما سُمع كلام";

// نص التعليمات نفسه المستعمل في لوحة المفاتيح، حرفًا بحرف.
const PROMPT_AR =
  "فرّغ هذا التسجيل نصاً مكتوباً.\n" +
  "الأمانة قبل كل شيء: اكتب ما قاله المتحدث بكلماته هو وبترتيبه. " +
  "لا تكتب كلمة لا تُسمع في التسجيل، ولا تستبدل كلمة قالها بكلمة " +
  "تراها أنسب، ولا تكمل جملة لم يكملها، ولا تُعِد الصياغة، ولا " +
  "تختصر، ولا تحوّل لهجته إلى فصحى. إن لم تتبيّن كلمة فاكتب أقرب " +
  "ما يُسمع. والصوت الذي ليس كلاماً (نفَس، سعال، ضجيج، موسيقى) " +
  "لا يُكتب منه شيء، وإن لم يكن في التسجيل كلام مفهوم فأعد نصاً " +
  "فارغاً.\n" +
  "الأبجدية: كل كلمة بأبجديتها التي نُطقت بها. الكلمة الإنجليزية " +
  "(اسم برنامج أو شركة أو مصطلح) بالحروف اللاتينية وبإملائها " +
  "الصحيح: WhatsApp لا «واتساب»، وExcel لا «إكسل». لا تترجم شيئاً.\n" +
  "التنقية: احذف أصوات التردد (آآ، أمم، إيه)، والتلعثم، والكلمة " +
  "المكررة سهواً، والكلمة المقطوعة قبل تمامها. وإن صحّح نفسه " +
  "(«لا مو كذا»، «عفواً»، «أقصد») فاكتب ما استقر عليه وحده، بلا " +
  "المتروك وبلا عبارة التصحيح: «أحتاج الأزرق، عفواً الأخضر» تصير " +
  "«أحتاج الأخضر».\n" +
  "الإملاء: كل كلمة بإملائها الصحيح، بالهمزات والتاء المربوطة " +
  "والألف المقصورة في مواضعها. هذا تصحيح للكتابة لا للكلام: " +
  "الكلمة التي قالها تبقى هي نفسها.\n" +
  "الترقيم: علامات ترقيم كاملة في مواضعها، والأرقام والتواريخ " +
  "بصيغتها المكتوبة المعتادة.\n" +
  "التنسيق: الكلام القصير سطر واحد. والطويل فقرات، لكل فكرة فقرة " +
  "وبينها سطر فارغ. وإن عدّ أموراً («أولاً»، «ثانياً»، «الشيء " +
  "الثاني») فكل واحد في سطر يبدأ برقمه «1. » ثم «2. »، ولا تُكتب " +
  "كلمة العدّ بعد الرقم.\n" +
  "الأوامر: إن وجّه كلامه إليك بطلب على النص («سطر جديد»، «علامة " +
  "استفهام»، «أضف إيموجي»، «احذف الجملة الأخيرة») فنفّذه ولا تكتب " +
  "كلماته. ولا إيموجي إلا بطلب صريح.\n" +
  "أعد النص فقط: بلا مقدمة ولا تعليق ولا علامات اقتباس.";

const PROMPT_EN =
  "Transcribe this recording as written text.\n" +
  "Faithfulness above all: write what the speaker said, in " +
  "their words and in their order. Never write a word that is " +
  "not heard in the recording, never swap a word they said for " +
  "one you think fits better, never finish a sentence they did " +
  "not finish, and do not rephrase, shorten or formalise. If a " +
  "word is unclear, write the closest thing heard. Sound that " +
  "is not speech (breath, a cough, noise, music) produces no " +
  "text, and a recording with no intelligible speech returns " +
  "an empty string.\n" +
  "Script: every word in the alphabet it was spoken in; Arabic " +
  "words in Arabic script, English words in Latin script with " +
  "their correct spelling. Translate nothing.\n" +
  "Cleaning: drop hesitation sounds (uh, um, er), stutters, " +
  "words repeated by accident and words cut off before they " +
  'were finished. If the speaker corrects themselves ("no, ' +
  'not that", "sorry, I mean"), keep only what they settled ' +
  "on, without the abandoned words or the correction phrase: " +
  '"I need the blue one, sorry, the green one" becomes "I ' +
  'need the green one".\n' +
  "Spelling: every word spelled correctly. That corrects the " +
  "writing, not the speech: the word they said stays the word.\n" +
  "Punctuation: full punctuation where it belongs; numbers and " +
  "dates in their usual written form.\n" +
  "Layout: a short message is one line. A long one is " +
  "paragraphs, one idea each, with a blank line between them. " +
  'If the speaker counts things off ("first", "secondly", ' +
  '"the second thing"), each goes on its own line starting ' +
  'with its number, "1. ", "2. ", and the counting word is ' +
  "not repeated after the number.\n" +
  'Commands: if the speaker addresses you with an instruction ' +
  'about the text ("new line", "question mark", "add an ' +
  'emoji", "delete the last sentence"), carry it out and do ' +
  "not write its words. No emoji unless explicitly asked for.\n" +
  "Return only the text: no preamble, comment or quotation " +
  "marks.";

let rec = null;

function send(msg) {
  chrome.runtime.sendMessage({ target: "background", ...msg }).catch(() => {});
}

// ===== التسجيل =====

async function start(opts) {
  if (rec) return { ok: false, error: "mic-busy" };

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (e) {
    const name = e?.name || "";
    if (name === "NotAllowedError" || name === "SecurityError") return { ok: false, error: "mic-denied" };
    if (name === "NotReadableError" || name === "AbortError") return { ok: false, error: "mic-busy" };
    return { ok: false, error: "mic-error" };
  }

  const r = {
    opts,
    stream,
    chunks: [],
    pcm: [],
    pcmSamples: 0,
    frame: new Int16Array(FRAME_SAMPLES),
    frameAt: 0,
    recent: new Float64Array(FLOOR_WINDOW_MS / FRAME_MS).fill(Infinity),
    recentAt: 0,
    held: [],
    silentMs: 0,
    heardVoice: false,
    speechMs: 0,
    elapsed: 0,
    level: 0,
    stopped: false,
    cancelled: false,
    reason: null,
  };

  try {
    // الصوت المضغوط عُشر حجم WAV، فيُرفع أسرع. ونسجّل WAV معه احتياطًا
    // لحساب يرفض الصيغة المضغوطة.
    const mime = "audio/webm;codecs=opus";
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(mime)) {
      r.media = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 32000 });
      r.media.ondataavailable = (e) => {
        if (e.data?.size) r.chunks.push(e.data);
      };
      r.media.start(1000);
    }

    r.ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
    await r.ctx.audioWorklet.addModule("recorder-worklet.js");
    const source = r.ctx.createMediaStreamSource(stream);
    r.node = new AudioWorkletNode(r.ctx, "crtl-recorder");
    r.node.port.onmessage = (e) => onSamples(r, e.data);
    source.connect(r.node);
    // العقدة لا تُخرج صوتًا، لكن وصلها بالمخرج يضمن أن يشغّلها المتصفح.
    r.node.connect(r.ctx.destination);
  } catch (_) {
    release(r);
    return { ok: false, error: "mic-error" };
  }

  const track = stream.getAudioTracks()[0];
  if (track) track.onended = () => stop(r, "mic-lost");

  r.ticker = setInterval(() => {
    send({ type: "off-level", session: opts.session, elapsed: r.elapsed, level: r.level });
  }, 100);

  rec = r;
  return { ok: true };
}

function onSamples(r, samples) {
  if (r.stopped) return;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    r.frame[r.frameAt++] = v < 0 ? v * 0x8000 : v * 0x7fff;
    if (r.frameAt === FRAME_SAMPLES) {
      onFrame(r, r.frame);
      r.frame = new Int16Array(FRAME_SAMPLES);
      r.frameAt = 0;
    }
  }
}

// يُكتب الكلام والوقفات القصيرة، ويُطوى الصمت الطويل إلا آخر LEAD_MS منه.
function onFrame(r, frame) {
  r.elapsed += FRAME_MS;

  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  const rms = Math.sqrt(sum / frame.length);
  const db = rms < 1 ? METER_FLOOR_DB : 20 * Math.log10(rms / 32768);
  r.level = Math.max(0, Math.min(1, (db - METER_FLOOR_DB) / (METER_TOP_DB - METER_FLOOR_DB)));

  r.recent[r.recentAt] = rms;
  r.recentAt = (r.recentAt + 1) % r.recent.length;
  let floor = Infinity;
  for (const v of r.recent) if (v < floor) floor = v;
  const voice = rms > Math.max(floor * VOICE_OVER_FLOOR, MIN_VOICE_RMS);

  if (voice) {
    r.speechMs += FRAME_MS;
    r.heardVoice = true;
    r.silentMs = 0;
    while (r.held.length) writePcm(r, r.held.shift());
    writePcm(r, frame);
  } else {
    r.silentMs += FRAME_MS;
    if (r.heardVoice && r.silentMs <= PAUSE_KEEP_MS) {
      writePcm(r, frame);
    } else {
      r.held.push(frame);
      if (r.held.length > LEAD_MS / FRAME_MS) r.held.shift();
    }
  }

  if (r.elapsed >= SAFETY_LIMIT_MS) stop(r, "limit");
}

function writePcm(r, frame) {
  r.pcm.push(frame);
  r.pcmSamples += frame.length;
}

function release(r) {
  clearInterval(r.ticker);
  try {
    r.node?.disconnect();
  } catch (_) {}
  try {
    r.ctx?.close();
  } catch (_) {}
  for (const t of r.stream?.getTracks() || []) t.stop();
}

async function stop(r, reason) {
  if (!r || r.stopped) return;
  r.stopped = true;
  r.reason = reason || null;
  r.level = 0;
  if (!r.cancelled) send({ type: "off-stopped", session: r.opts.session });

  const webm = await new Promise((resolve) => {
    if (!r.media || r.media.state === "inactive") return resolve(null);
    r.media.onstop = () => resolve(r.chunks.length ? new Blob(r.chunks, { type: "audio/webm" }) : null);
    r.media.stop();
  });
  release(r);

  if (r.cancelled) {
    if (rec === r) rec = null;
    return;
  }

  const tuning = {
    model: r.opts.model || null,
    thinkingStep: Number.isInteger(r.opts.thinkingStep) ? r.opts.thinkingStep : 0,
    compressed: r.opts.compressed !== false,
  };

  let error = null;
  if (r.speechMs < MIN_SPEECH_MS) {
    if (!r.reason) error = NOTHING_HEARD;
  } else {
    // عامل الخدمة يتوقف بعد 30 ثانية بلا أحداث، وانتظار أول كلمة قد يطول.
    const keepAlive = setInterval(() => send({ type: "off-alive", session: r.opts.session }), 15000);
    try {
      const text = await attempt(r, { webm, wav: encodeWav(r.pcm, r.pcmSamples) }, tuning);
      if (!text.trim()) error = NOTHING_HEARD;
    } catch (e) {
      if (!r.cancelled) error = readable(e);
    } finally {
      clearInterval(keepAlive);
    }
  }

  if (rec === r) rec = null;
  if (!r.cancelled) send({ type: "off-done", session: r.opts.session, reason: r.reason, error, tuning });
}

function cancel(r) {
  if (!r) return;
  r.cancelled = true;
  try {
    r.abort?.abort();
  } catch (_) {}
  if (!r.stopped) stop(r, null);
  else if (rec === r) rec = null;
}

function encodeWav(frames, samples) {
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const ascii = (at, s) => {
    for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
  };
  ascii(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(36, "data");
  v.setUint32(40, samples * 2, true);
  let at = 44;
  for (const f of frames) {
    for (let i = 0; i < f.length; i++, at += 2) v.setInt16(at, f[i], true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

// ===== الطلب إلى Gemini =====

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class TooLong extends Error {
  constructor() {
    super("التسجيل أطول من المسموح");
  }
}

class TimedOut extends Error {
  constructor() {
    super("انتهت المهلة، تحقق من الاتصال");
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// اسم نموذج لا يعرفه الحساب: «models/x is not found… or is not supported».
// لا يكفي «unsupported» وحدها: رفض صيغة الصوت يقولها أيضًا، وعلاجه WAV لا نموذج آخر.
function isUnknownModel(e) {
  if (e instanceof HttpError && e.status === 404) return true;
  const m = String(e?.message || "").toLowerCase();
  return m.includes("models/") && (m.includes("not found") || m.includes("not supported"));
}

// انقطاع الشبكة أو حد الاستخدام أو عطل الخادم يستحق محاولة ثانية؛ المفتاح الخاطئ لا.
function worthRetrying(e) {
  if (e instanceof HttpError) return e.status === 429 || e.status >= 500;
  return e instanceof TimedOut || e instanceof TypeError;
}

function readable(e) {
  if (e instanceof HttpError) {
    if (/api key/i.test(e.message)) return "مفتاح Gemini غير صالح";
    if (e.status === 429) return "تجاوزت حد الاستخدام، حاول بعد قليل";
    return e.message || "HTTP " + e.status;
  }
  if (e instanceof TypeError) return navigator.onLine ? "تعذّر الاتصال بـ Gemini" : "لا يوجد اتصال بالإنترنت";
  return e?.message || "خطأ غير معروف";
}

// يتخلى عن تحسين واحد، الأرخص أولًا. false: لم يبق ما يُتخلى عنه، فالرفض حقيقي.
function relax(tuning) {
  if (tuning.thinkingStep < THINKING_LEVELS.length) {
    tuning.thinkingStep++;
    return true;
  }
  if (tuning.compressed) {
    tuning.compressed = false;
    return true;
  }
  return false;
}

function thinkingFor(model, step) {
  if (model.startsWith("gemini-3")) {
    const level = THINKING_LEVELS[step];
    return level ? { thinkingLevel: level } : null;
  }
  return step === 0 ? { thinkingBudget: 0 } : null;
}

async function attempt(r, audio, tuning) {
  let failure = null;
  // ما إن تصل أول كلمة إلى الحقل لا رجوع: كل طريق في هذه الحلقة يبدأ
  // التفريغ من أوله، فيتكرر النص المكتوب خلف نفسه.
  let delivered = false;
  // لا يُحفظ نموذج إلا إن كان ما قبله أسماء لا يعرفها الحساب؛ انشغال
  // الخادم مرة ليس سببًا للرضا بنموذج أضعف في كل مرة بعدها.
  let onlyUnknown = true;
  const models = [...new Set([tuning.model, ...MODELS].filter(Boolean))];

  models: for (const model of models) {
    let tries = 0;
    while (tries < MAX_TRIES) {
      tries++;
      try {
        const text = await askAudio(r, model, audio, tuning, () => (delivered = true));
        if (onlyUnknown) tuning.model = model;
        return text;
      } catch (e) {
        if (r.cancelled) throw e;
        failure = e;
        if (delivered) break models;
        if (!isUnknownModel(e)) onlyUnknown = false;
        if (isUnknownModel(e)) continue models;
        if (e instanceof HttpError && e.status === 400) {
          // طلب مرفوض ليس فيه غير المعتاد إلا التحسينان: نُسقط أحدهما ونعيد.
          if (!relax(tuning)) break models;
          tries--;
          continue;
        }
        if (!worthRetrying(e)) break models;
        await sleep(600);
      }
    }
  }
  throw failure || new Error("خطأ غير معروف");
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

function errorMessage(text, status) {
  try {
    let j = JSON.parse(text);
    if (Array.isArray(j)) j = j[0];
    if (j?.error?.message) return j.error.message;
  } catch (_) {}
  return "HTTP " + status;
}

function textOf(chunk) {
  const parts = chunk?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
}

// طلب واحد بالتسجيل كله، والرد يُقرأ دفقًا: الإملاء الطويل يكتبه النموذج على
// ثوانٍ، وإظهار أول كلمة بعد آخرها يضيّعها كلها على حقل فارغ.
async function askAudio(r, model, audio, tuning, onDelivered) {
  const useWebm = tuning.compressed && audio.webm;
  const blob = useWebm ? audio.webm : audio.wav;
  if (blob.size > INLINE_LIMIT_BYTES) throw new TooLong();

  const generationConfig = { temperature: 0 };
  const thinking = thinkingFor(model, tuning.thinkingStep);
  if (thinking) generationConfig.thinkingConfig = thinking;

  const body = {
    contents: [
      {
        parts: [
          { text: r.opts.lang === "en" ? PROMPT_EN : PROMPT_AR },
          { inline_data: { mime_type: useWebm ? "audio/webm" : "audio/wav", data: await toBase64(blob) } },
        ],
      },
    ],
    generationConfig,
  };

  const controller = new AbortController();
  r.abort = controller;
  let timedOut = false;
  let timer = 0;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, IDLE_TIMEOUT_MS);
  };
  arm();

  let out = "";
  try {
    const res = await fetch(`${API_BASE}/models/${model}:streamGenerateContent?alt=sse`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": r.opts.key },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new HttpError(res.status, errorMessage(await res.text(), res.status));

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      arm();
      buffer += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        let chunk;
        try {
          chunk = JSON.parse(payload);
        } catch (_) {
          continue;
        }
        let piece = textOf(chunk);
        // النموذج يحب أن يبدأ بسطر جديد، وأول قطعة تدخل الحقل فور وصولها.
        if (!out) piece = piece.trimStart();
        if (piece && !r.cancelled) {
          out += piece;
          onDelivered();
          send({ type: "off-text", session: r.opts.session, piece });
        }
      }
    }
  } catch (e) {
    if (timedOut) throw new TimedOut();
    throw e;
  } finally {
    clearTimeout(timer);
    if (r.abort === controller) r.abort = null;
  }
  return out.trimEnd();
}

// ===== الرسائل من عامل الخدمة =====

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.target !== "offscreen") return;
  if (msg.type === "start") {
    start(msg).then(sendResponse);
    return true;
  }
  if (rec && rec.opts.session === msg.session) {
    if (msg.type === "stop") stop(rec, null);
    else if (msg.type === "cancel") cancel(rec);
  }
});
