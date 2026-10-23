"""
Script: generate_audio_test_set.py
Purpose: Generates a realistic synthetic Arabic audio test set focusing on Saudi/Gulf speech nuances
using edge-tts (Microsoft Edge Neural Voices: ar-SA-HamedNeural, ar-SA-ZariyahNeural).
"""

import os
import json
import asyncio
import edge_tts

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "audio_test_set")
os.makedirs(OUTPUT_DIR, exist_ok=True)

DATASET = [
    {
        "sample_id": "MVA-001",
        "scenario_ref": "MV-001",
        "ground_truth_text": "يعطيك العافية يا وحش، لعبت جيم بطل والتحركات كانت أسطورية.",
        "ground_truth_label": "سليم",
        "ground_truth_risk": "منخفض",
        "voice": "ar-SA-HamedNeural",
        "rate": "+0%",
        "category_note": "تشجيع وثناء بأسلوب لاعبي الألعاب الإلكترونية"
    },
    {
        "sample_id": "MVA-002",
        "scenario_ref": "MV-002",
        "ground_truth_text": "تعال نتحرك من يمين وناخذ الزون قبل الفريق الثاني.",
        "ground_truth_label": "سليم",
        "ground_truth_risk": "منخفض",
        "voice": "ar-SA-HamedNeural",
        "rate": "+5%",
        "category_note": "تنسيق تكتيكي داخل اللعبة واستخدام مصطلحات شائعة"
    },
    {
        "sample_id": "MVA-003",
        "scenario_ref": "MV-003",
        "ground_truth_text": "شكراً لك على التغطية والمساعدة في الجولة الأخيرة.",
        "ground_truth_label": "سليم",
        "ground_truth_risk": "منخفض",
        "voice": "ar-SA-ZariyahNeural",
        "rate": "+0%",
        "category_note": "عبارة شكر عادية بصوت أنثوي"
    },
    {
        "sample_id": "MVA-004",
        "scenario_ref": "MV-025",
        "ground_truth_text": "أنا ما أشارك رقمي ولا معلوماتي الشخصية في اللعبة أبداً.",
        "ground_truth_label": "سليم",
        "ground_truth_risk": "منخفض",
        "voice": "ar-SA-ZariyahNeural",
        "rate": "+0%",
        "category_note": "رفض إيجابي لحماية الخصوصية لا يشكل تهديداً"
    },
    {
        "sample_id": "MVA-005",
        "scenario_ref": "MV-004",
        "ground_truth_text": "ترى اللعبة مجرد تسلية وما تستاهل أي زعل يا شباب.",
        "ground_truth_label": "سليم",
        "ground_truth_risk": "منخفض",
        "voice": "ar-SA-HamedNeural",
        "rate": "-5%",
        "category_note": "تهدئة وحوار ودي مع استخدام أداة التنبيه ترى"
    },
    {
        "sample_id": "MVA-006",
        "scenario_ref": "MV-007",
        "ground_truth_text": "أنت يا غبي ما تفهم وتخرب علينا كل قيم.",
        "ground_truth_label": "إساءة",
        "ground_truth_risk": "متوسط",
        "voice": "ar-SA-HamedNeural",
        "rate": "+5%",
        "category_note": "إهانة مباشرة واضحة باستخدام لفظ جارح"
    },
    {
        "sample_id": "MVA-007",
        "scenario_ref": "MV-008",
        "ground_truth_text": "يا فاشل اطلع من اللعبة ما نبي نلعب معك.",
        "ground_truth_label": "إساءة",
        "ground_truth_risk": "متوسط",
        "voice": "ar-SA-ZariyahNeural",
        "rate": "+5%",
        "category_note": "تنمر وإقصاء موجه ضد لاعب"
    },
    {
        "sample_id": "MVA-008",
        "scenario_ref": "MV-009",
        "ground_truth_text": "يا حيوان لا تسوي نفسك محترف وانت ما تعرف تلعب.",
        "ground_truth_label": "إساءة",
        "ground_truth_risk": "متوسط",
        "voice": "ar-SA-HamedNeural",
        "rate": "+0%",
        "category_note": "إهانة صريحة وسب مباشر"
    },
    {
        "sample_id": "MVA-009",
        "scenario_ref": "MV-010",
        "ground_truth_text": "مستواك زبالة وما منك أي فايدة في هذا التيم.",
        "ground_truth_label": "إساءة",
        "ground_truth_risk": "متوسط",
        "voice": "ar-SA-HamedNeural",
        "rate": "+5%",
        "category_note": "تحقير للمستوى وازدراء لفظي"
    },
    {
        "sample_id": "MVA-010",
        "scenario_ref": "MV-011",
        "ground_truth_text": "والله لاجيك عند بيتك واوريك شغلك يا كلب.",
        "ground_truth_label": "تهديد",
        "ground_truth_risk": "مرتفع",
        "voice": "ar-SA-HamedNeural",
        "rate": "+5%",
        "category_note": "تهديد بإيذاء بدني خارج اللعبة مع ذكر البيت"
    },
    {
        "sample_id": "MVA-011",
        "scenario_ref": "MV-012",
        "ground_truth_text": "راح ادمر حسابك واخليك تندم على اليوم اللي لعبت فيه.",
        "ground_truth_label": "تهديد",
        "ground_truth_risk": "مرتفع",
        "voice": "ar-SA-HamedNeural",
        "rate": "+0%",
        "category_note": "تهديد بتخريب رقمي وإلحاق الضرر"
    },
    {
        "sample_id": "MVA-012",
        "scenario_ref": "MV-013",
        "ground_truth_text": "والله ما اخليك تفلت مني وبتشوف وش اسوي فيك بعد البث.",
        "ground_truth_label": "تهديد",
        "ground_truth_risk": "مرتفع",
        "voice": "ar-SA-ZariyahNeural",
        "rate": "+5%",
        "category_note": "وعيد وانتقام مستقبلي بصوت أنثوي"
    },
    {
        "sample_id": "MVA-013",
        "scenario_ref": "MV-014",
        "ground_truth_text": "عطني رقم جوالك بسرعة عشان اضيفك في الواتساب.",
        "ground_truth_label": "طلب معلومات شخصية",
        "ground_truth_risk": "مرتفع",
        "voice": "ar-SA-HamedNeural",
        "rate": "+0%",
        "category_note": "طلب رقم هاتف بلهجة سعودية (عطني)"
    },
    {
        "sample_id": "MVA-014",
        "scenario_ref": "MV-015",
        "ground_truth_text": "وين ساكن بأي حي وأي شارع في الرياض بالضبط؟",
        "ground_truth_label": "طلب معلومات شخصية",
        "ground_truth_risk": "مرتفع",
        "voice": "ar-SA-HamedNeural",
        "rate": "+0%",
        "category_note": "طلب عنوان سكني وموقع جغرافي دقيق"
    },
    {
        "sample_id": "MVA-015",
        "scenario_ref": "MV-016",
        "ground_truth_text": "وش اسم مدرستك وفي أي صف تدرس الحين؟",
        "ground_truth_label": "طلب معلومات شخصية",
        "ground_truth_risk": "مرتفع",
        "voice": "ar-SA-ZariyahNeural",
        "rate": "+0%",
        "category_note": "طلب معلومات تعليمية تخص قاصرين"
    },
    {
        "sample_id": "MVA-016",
        "scenario_ref": "MV-017",
        "ground_truth_text": "ارسل لي حسابك الخاص في السناب شات خلنا نسولف لحالنا.",
        "ground_truth_label": "طلب معلومات شخصية",
        "ground_truth_risk": "مرتفع",
        "voice": "ar-SA-HamedNeural",
        "rate": "+0%",
        "category_note": "محاولة استدراج للتواصل المنفرد خارج بيئة اللعبة"
    },
    {
        "sample_id": "MVA-017",
        "scenario_ref": "MV-005",
        "ground_truth_text": "ترى أمزح معك لا تاخذها جد يا خوي والله ما قصدت.",
        "ground_truth_label": "مراجعة سياقية",
        "ground_truth_risk": "متوسط",
        "voice": "ar-SA-HamedNeural",
        "rate": "+0%",
        "category_note": "تعبير عن المزاح ونفي القصد يتطلب فهم النية والسياق"
    },
    {
        "sample_id": "MVA-018",
        "scenario_ref": "MV-030",
        "ground_truth_text": "راح اصفيك في الراوند الجاي داخل اللعبة بس لا تزعل.",
        "ground_truth_label": "مراجعة سياقية",
        "ground_truth_risk": "متوسط",
        "voice": "ar-SA-HamedNeural",
        "rate": "+5%",
        "category_note": "مصطلح قتالي داخل اللعبة (أصفيك) لكنه محصور داخل اللعب"
    },
    {
        "sample_id": "MVA-019",
        "scenario_ref": "MV-027",
        "ground_truth_text": "يا عمي هذا مقلب سويته فيك عشان نضحك بس.",
        "ground_truth_label": "مراجعة سياقية",
        "ground_truth_risk": "متوسط",
        "voice": "ar-SA-ZariyahNeural",
        "rate": "+5%",
        "category_note": "مقلب ومزاح يستدعي تدقيقاً بشرياً لتمييزه عن الاستدراج"
    },
    {
        "sample_id": "MVA-020",
        "scenario_ref": "MV-025",
        "ground_truth_text": "ما راح اعطيك رقمي ولا راح ارسل لك أي صورة.",
        "ground_truth_label": "مراجعة سياقية",
        "ground_truth_risk": "متوسط",
        "voice": "ar-SA-ZariyahNeural",
        "rate": "+0%",
        "category_note": "جملة نفي صارمة لطلب البيانات الشخصية؛ قد تلتبس على الفرز الكلماتي"
    }
]

async def generate_all():
    manifest = {
        "dataset_name": "Mizan Voice Synthetic Arabic Benchmark (MVA-20)",
        "creation_date": "2026-10-23",
        "generation_method": "Microsoft Edge Neural Text-to-Speech (edge-tts)",
        "synthetic_notice": (
            "هذه العينات مولدة عبر أصوات اصطناعية عصبية تتبنى نبرة ونطقاً سعودياً تقريبياً "
            "(ar-SA-HamedNeural و ar-SA-ZariyahNeural)، ولا تمثل تنوع كافة اللهجات السعودية "
            "ولا تغني عن الاختبار الميداني البشري المعتمد."
        ),
        "license_note": "مخصصة لأغراض التدقيق العلمي وتقييم نماذج الذكاء الاصطناعي وهندسة الصوت في بيئة ميزان صوت.",
        "samples_count": len(DATASET),
        "samples": []
    }

    print(f"Starting audio generation for {len(DATASET)} samples into {OUTPUT_DIR}...")
    for item in DATASET:
        filename = f"{item['sample_id']}.mp3"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        print(f"Generating {item['sample_id']} ({item['voice']}, {item['rate']}): '{item['ground_truth_text'][:35]}...'")
        communicate = edge_tts.Communicate(
            text=item["ground_truth_text"],
            voice=item["voice"],
            rate=item["rate"]
        )
        await communicate.save(filepath)
        
        file_size = os.path.getsize(filepath)
        
        entry = {
            **item,
            "filename": filename,
            "relative_path": f"data/audio_test_set/{filename}",
            "file_size_bytes": file_size,
            "format": "audio/mpeg (MP3, 24kHz)",
            "tts_engine": "edge-tts",
            "model_version": "Azure Cognitive Services Neural TTS"
        }
        manifest["samples"].append(entry)

    manifest_path = os.path.join(OUTPUT_DIR, "audio_test_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"Manifest written successfully to: {manifest_path}")

    # Also generate a CSV manifest for easy inspection
    csv_path = os.path.join(OUTPUT_DIR, "audio_test_manifest.csv")
    with open(csv_path, "w", encoding="utf-8-sig") as f:
        f.write("sample_id,scenario_ref,ground_truth_label,ground_truth_risk,voice,ground_truth_text,category_note,filename,file_size_bytes\n")
        for s in manifest["samples"]:
            clean_text = s["ground_truth_text"].replace('"', '""')
            clean_note = s["category_note"].replace('"', '""')
            f.write(f'"{s["sample_id"]}","{s["scenario_ref"]}","{s["ground_truth_label"]}","{s["ground_truth_risk"]}","{s["voice"]}","{clean_text}","{clean_note}","{s["filename"]}",{s["file_size_bytes"]}\n')
    print(f"CSV Manifest written successfully to: {csv_path}")

if __name__ == "__main__":
    asyncio.run(generate_all())
