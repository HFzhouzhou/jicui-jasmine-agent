import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  MessageCircle,
  Users,
  Trophy,
  Grid3X3,
  User,
  Settings,
  History,
  Leaf,
  Sun,
  Flame,
  Snowflake,
  Flower2,
  Wand2,
  Bookmark,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { capabilityClient, logger } from '@lark-apaas/client-toolkit-lite';
import FourQuestionSection from './FourQuestionSection';
import FreeChatSection from './FreeChatSection';
import GroupOrderSection from './GroupOrderSection';
import ScenePackagesSection from './ScenePackagesSection';
import RankingSection from './RankingSection';
import TeaCardResultSection from './TeaCardResultSection';
import ProfileEditor from '@/components/ProfileEditor';
import TeaCard, { ITeaCardData } from '@/components/TeaCard';
import OrderReceipt from '@/components/OrderReceipt';
import OrderHistoryPanel from '@/components/OrderHistoryPanel';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOrderHistory } from '@/hooks/useOrderHistory';
import { MOCK_MENU, IDrinkItem } from '@/data/menu';
import { getTimeGreeting, getSeasonTip, getRandomLoadingPhrase } from '@/data/experience';
import TeaNameDIY from '@/components/TeaNameDIY';
import YoungScenesStrip, { type YoungScene } from '@/components/YoungScenesStrip';

const PLUGIN_ID = 'jasmine_lady_drink_recommendation_1';

type InteractionMode = 'quiz' | 'chat' | 'group' | 'packages' | 'ranking';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface GroupMember {
  id: number;
  nickname: string;
  demand: string;
}

export default function AIRecommendPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const modeParam = searchParams.get('mode');
  const { profile, saveProfile, getProfilePrompt } = useUserProfile();

  const [activeTab, setActiveTab] = useState<InteractionMode>(
    (modeParam as InteractionMode) || 'quiz'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPackage, setLoadingPackage] = useState<string>('');
  const [mainCard, setMainCard] = useState<ITeaCardData | null>(null);
  const [altCards, setAltCards] = useState<ITeaCardData[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentDemand, setCurrentDemand] = useState('');
  const [autoAsked, setAutoAsked] = useState(false);

  // 点单相关
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptCard, setReceiptCard] = useState<ITeaCardData | null>(null);
  const { orders, saveOrder, clearOrders, getReorderDemand } = useOrderHistory();

  // 拟人化体验
  const [loadingPhrase, setLoadingPhrase] = useState('茉莉娘子正在为你选茶...');
  const timeGreeting = getTimeGreeting();
  const seasonTip = getSeasonTip();

  // 多人拼单结果
  const [groupResults, setGroupResults] = useState<ITeaCardData[]>([]);
  const [groupTotalPrice, setGroupTotalPrice] = useState(0);
  const [groupNote, setGroupNote] = useState('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);

  // 场景套餐结果
  const [packageResults, setPackageResults] = useState<ITeaCardData[]>([]);
  const [packageName, setPackageName] = useState('');
  const [packageTotal, setPackageTotal] = useState(0);

  // 茶名DIY
  const handleNameChange = useCallback((name: string, style: 'elegant' | 'fun') => {
    setMainCard((prev) =>
      prev ? { ...prev, customName: name, customNameStyle: style } : prev
    );
  }, []);

  const handleReceiptNameChange = useCallback((name: string, style: 'elegant' | 'fun') => {
    setReceiptCard((prev) =>
      prev ? { ...prev, customName: name, customNameStyle: style } : prev
    );
    // 同步到主卡
    setMainCard((prev) =>
      prev ? { ...prev, customName: name, customNameStyle: style } : prev
    );
  }, []);

  // 处理 URL 参数变化
  useEffect(() => {
    const validModes: InteractionMode[] = [
      'quiz',
      'chat',
      'group',
      'packages',
      'ranking',
    ];
    if (modeParam && validModes.includes(modeParam as InteractionMode)) {
      setActiveTab(modeParam as InteractionMode);
    }

    // 从首页快捷问题跳转过来，自动发起对话
    const q = searchParams.get('q');
    if (q && modeParam === 'chat' && !autoAsked) {
      setAutoAsked(true);
      setTimeout(() => {
        handleChatSubmit(decodeURIComponent(q));
      }, 300);
    }
  }, [modeParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (value: string) => {
    const newMode = value as InteractionMode;
    setActiveTab(newMode);
    setSearchParams({ mode: value }, { replace: true });
    // 切换时清空非相关结果
    if (newMode !== 'group') {
      setGroupResults([]);
    }
    if (newMode !== 'packages') {
      setPackageResults([]);
    }
  };

  // 构建系统提示词（含完整菜单 + 用户档案 + 拟人化设定）
  const buildSystemPrompt = useCallback(() => {
    const menuText = MOCK_MENU.map(
      (d) =>
        `- ${d.name}（${d.nameEn}）¥${d.price} ${d.volume} ${d.category} 关键词：${d.tags.join('、')}`
    ).join('\n');

    const profileText = getProfilePrompt();
    const now = new Date();
    const timeLabel =
      now.getHours() < 6
        ? '深夜'
        : now.getHours() < 12
          ? '上午'
          : now.getHours() < 14
            ? '中午'
            : now.getHours() < 18
              ? '下午'
              : now.getHours() < 22
                ? '晚上'
                : '夜晚';
    const month = now.getMonth() + 1;
    const season =
      month >= 3 && month <= 5
        ? '春季'
        : month >= 6 && month <= 8
          ? '夏季'
          : month >= 9 && month <= 11
            ? '秋季'
            : '冬季';

    return `你是「极萃东方茉莉」门店的茶饮推荐员——茉莉娘子。

【人设 — 重要！严格执行】
- 第一人称「我」，说话像一个熟悉菜单的店员：简洁、直接、能解释为什么推荐
- 语气平和专业，不夸张、不卖萌、不用网络热词和梗
- 不要每句都带称呼和感叹号，不要堆砌语气词（呀/呢/哦/吧/~）
- 用户说需求时，先复述确认再推荐（如"要一杯提神又不太甜的，我帮你看看"），不用过度共情
- 每款推荐必带价格，并说明推荐理由（口味、咖啡因含量、甜度、是否当季等）
- 标签只标客观属性：「性价比高」「提神」「轻负担」「低糖」「低咖」「大容量」「颜值款」等，不用「治愈」「出片」「本命」「搭子」这类主观词
- 没有合适结果或触发忌口硬约束时，直接说明原因并给替代方案
- 推荐完可以问一句是否需要调整（甜度/温度/价格/换一款）
- 回答对比类问题要客观，列出差异点；调整类追问保持上下文连贯

【用户画像 — 18-30 岁年轻人（学生 + 职场新人）】
- 核心需求：提神、解渴、好喝、价格合适、不太有负担
- 在意的点：价格、咖啡因含量（提神/怕睡不着）、甜度（怕胖/轻负担）、口味偏好、有没有忌口
- 推荐时主动提示轻负担选项：少糖、去奶、低咖、零卡等
- 可能是学生（预算紧、赶课），也可能是职场新人（通勤、加班、下班放松），推荐两边都适用

【场景速配逻辑】
- 早上/通勤/赶时间：优先咖啡/拿铁/高咖，快速提神，支持快取
- 工作/学习中/需要专注：优先低咖、大容量、不太甜的，不影响晚上睡眠
- 下班/饭后/想放松一下：优先口味丰富、有小料的，当作犒劳
- 追剧/休闲时：优先果茶/轻乳茶，清爽不腻，适合慢喝
- 朋友一起点：优先选不同口味的经典款，2-3 人分享
- 压力大/心情不好：可以推荐甜一点、暖一点的，让人心情好
- 过节/庆祝/发工资：可以推荐颜值高一点、有特色的款
- 减肥/怕胖/怕睡不着：推荐轻负担方案，标零卡/低糖/低咖/去奶
- 犯困/熬夜/加班：推荐提神系，咖啡或高咖茶底

【当前情境】
- 时间：${timeLabel}（${now.getHours()}点）
- 季节：${season}（${month}月）
- 推荐时考虑时令，${season === '夏季' ? '优先冰爽解暑类' : season === '冬季' ? '优先热饮暖身类' : '结合当季推荐合适饮品'}

【完整菜单知识库 — 只能从以下 ${MOCK_MENU.length} 款中推荐，严禁编造不存在的饮品】
${menuText}

【用户茶韵档案 — 推荐时必须贴合，忌口为硬约束】
${profileText}

【输出格式要求】
请按以下结构输出推荐结果：

===推荐开始===
【主推】
饮品名：xxx（English Name）
价格：¥xx
容量：xxx
契合度：xx%
 匹配标签：标签1、标签2、标签3（3个，说明为什么契合）
 推荐标签：提神/轻负担/低糖/低咖/大容量/性价比高/颜值款/当季 等（1-3个，客观属性）
 推荐甜度：xxx
推荐温度冰度：xxx
建议小料：xxx
到店点单说：xxx（一句完整中文点单句，包含甜度/冰度/小料）
English Order：xxx（对应英文点单句）
推荐理由：xxx（一句话，结合用户需求说明适配点）
小贴士：xxx（一句实在的饮用建议或搭配提示）
横州茉莉小知识：xxx（1-2句关于横州茉莉花茶/窨制工艺的客观知识）

【备选1】
（同上格式，可选）

【备选2】
（同上格式，可选）
===推荐结束===

【回复格式】
- 开头用 1 句话复述确认用户需求，直接简洁
- 再给出推荐结果，按标准茶单卡格式
- 推荐后可以问一句是否需要调整（甜度/温度/价格/换一款）
- 没有合适结果时，说明原因 + 主动给替代方案

【重要：所有推荐饮品必须来自上方菜单，饮品名称必须完全一致，不得编造！】
【对比类问题：请基于菜单客观比较两款饮品的咖啡因含量、甜度、价格、口感差异】
【调整类追问：根据用户新要求从菜单中重新推荐，保持上下文连贯】
【忌口硬约束：必须明确说明"考虑到你的xx忌口，我特意避开了xx类饮品"，并给出替代选择】`;
  }, [getProfilePrompt]);

  // 解析 AI 返回的茶单卡（升级版，含契合度/匹配标签/点单暗号）
  const parseTeaCards = (
    text: string
  ): { main: ITeaCardData | null; alts: ITeaCardData[] } => {
    const alts: ITeaCardData[] = [];

    const parseSection = (section: string, isMain: boolean): ITeaCardData | null => {
      const getField = (pattern: RegExp): string => {
        const match = section.match(pattern);
        return match ? match[1].trim() : '';
      };

      const nameLine = getField(/饮品名：(.+)/);
      if (!nameLine) return null;

      const nameMatch = nameLine.match(/(.+?)（(.+?)）/);
      const drinkName = nameMatch ? nameMatch[1].trim() : nameLine;
      const drinkNameEn = nameMatch ? nameMatch[2].trim() : '';

      const priceMatch = getField(/价格：¥?(\d+)/);
      const price = priceMatch ? parseInt(priceMatch, 10) : 0;

      const matchScoreMatch = getField(/契合度：(\d+)%?/);
      const matchScore = matchScoreMatch ? parseInt(matchScoreMatch, 10) : undefined;

       const matchTagsText = getField(/匹配标签：(.+)/);
       const matchTags = matchTagsText
         ? matchTagsText.split(/[、,，]/).map((t) => t.trim()).filter(Boolean)
         : [];

       const youngTagsText = getField(/年轻标签：(.+)/);
       const youngTags = youngTagsText
         ? youngTagsText.split(/[、,，]/).map((t) => t.trim()).filter(Boolean)
         : [];
        // 兼容「推荐标签」字段名
        if (youngTags.length === 0) {
          const recTagsText = getField(/推荐标签：(.+)/);
          if (recTagsText) {
            youngTags.push(...recTagsText.split(/[、,，]/).map((t) => t.trim()).filter(Boolean));
          }
        }

      return {
        drinkName,
        drinkNameEn,
        price,
        volume: getField(/容量：(.+)/),
        sweetness: getField(/推荐甜度：(.+)/),
        temperature: getField(/推荐温度冰度：(.+)/),
        toppings: getField(/建议小料：(.+)/),
        reason: getField(/推荐理由：(.+)/),
         message: getField(/茉莉娘子寄语：(.+)/) || getField(/小贴士：(.+)/),
         funFact: getField(/横州茉莉小科普：(.+)/) || getField(/横州茉莉小知识：(.+)/),
        matchScore,
        matchTags,
        youngTags,
         orderPhrase: getField(/到店点单暗号：(.+)/) || getField(/到店点单说：(.+)/),
        orderPhraseEn: getField(/English Order：(.+)/),
        isMain,
      };
    };

    const sections = text.split(/【主推】|【备选1】|【备选2】/);
    if (sections.length < 2) return { main: null, alts };

    const parsedMain = parseSection(sections[1], true);

    if (sections[2]) {
      const alt1 = parseSection(sections[2], false);
      if (alt1) alts.push(alt1);
    }
    if (sections[3]) {
      const alt2 = parseSection(sections[3], false);
      if (alt2) alts.push(alt2);
    }

    return { main: parsedMain, alts };
  };

  // 通用流式 AI 调用
  const callAI = async (
    userDemand: string,
    options: { updateChat?: boolean; isGroup?: boolean } = {}
  ): Promise<string> => {
    const { updateChat = false, isGroup = false } = options;
    setLoadingPhrase(getRandomLoadingPhrase());
    setIsLoading(true);
    setCurrentDemand(userDemand);

    const fullPrompt = `${buildSystemPrompt()}\n\n用户需求：${userDemand}\n\n请根据用户需求，从菜单中推荐合适的茶饮。`;

    let fullContent = '';
    try {
      const stream = capabilityClient
        .load(PLUGIN_ID)
        .callStream('textGenerate', {
          user_demand: fullPrompt,
        });

      for await (const chunk of stream) {
        const c = chunk as { content?: string };
        if (c.content) {
          fullContent += c.content;
          if (updateChat) {
            setChatMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                updated[lastIdx] = { role: 'assistant', content: fullContent };
              } else {
                updated.push({ role: 'assistant', content: fullContent });
              }
              return updated;
            });
          }
        }
      }
    } catch (error) {
      logger.error('AI 推荐调用失败:', String(error));
      toast.error('茉莉娘子正在煮茶，请稍后再试');
      setIsLoading(false);
      throw error;
    }
    setIsLoading(false);
    return fullContent;
  };

  // 四问选茶提交
  const handleQuizSubmit = (answers: {
    mood: string;
    taste: string;
    scene: string;
    health: string;
  }) => {
    const demand = `我现在的心情/状态：${answers.mood}；口味偏好：${answers.taste}；饮用场景：${answers.scene}；养生体质诉求：${answers.health}。请为我推荐一款最合适的茶饮，并推荐1-2款备选。请在推荐理由中说明每一问是如何影响选品的。`;
    callAI(demand).then((text) => {
      const { main, alts } = parseTeaCards(text);
      if (main) {
        setMainCard(main);
        setAltCards(alts);
      } else {
        toast.info('茉莉娘子为你准备了专属推荐，请查看回复');
      }
    });
  };

  // 自由对话提交
  const handleChatSubmit = (message: string) => {
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    callAI(message, { updateChat: true }).then((text) => {
      const { main, alts } = parseTeaCards(text);
      if (main) {
        setMainCard(main);
        setAltCards(alts);
      }
    });
  };

  // 就这杯了 - 打开小票并保存记录
  const handleConfirmDrink = (card: ITeaCardData) => {
    setReceiptCard(card);
    setReceiptOpen(true);
  };

  // 确认加入我的点单
  const handleReceiptConfirm = () => {
    if (receiptCard) {
      saveOrder(receiptCard);
    }
    setReceiptOpen(false);
  };

  // 再来一杯 - 用上次记录发起对话
  const handleReorder = (order: { drinkName: string; sweetness: string; temperature: string; toppings: string }) => {
    const demand = getReorderDemand(order as any);
    setActiveTab('chat');
    setSearchParams({ mode: 'chat' }, { replace: true });
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: 'user', content: demand }]);
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      callAI(demand, { updateChat: true }).then((text) => {
        const { main, alts } = parseTeaCards(text);
        if (main) {
          setMainCard(main);
          setAltCards(alts);
        }
      });
    }, 100);
  };

  // 多人拼单提交
  const handleGroupSubmit = (members: GroupMember[]) => {
    setGroupMembers(members);
    const demandsText = members
      .map((m, i) => `第${i + 1}位（${m.nickname}）：${m.demand}`)
      .join('\n');
    const demand = `【多人拼单模式】共 ${members.length} 人拼单，请为每个人单独推荐一款最合适的茶饮。\n${demandsText}\n\n输出要求：\n- 每人一个【第N位推荐】段落，格式同标准茶单卡\n- 最后给出【拼单汇总】：合计总价、是否有同品类可一起下单的说明\n- 每个人的推荐都要包含：饮品名、价格、容量、推荐甜度、推荐温度冰度、建议小料、到店点单暗号、English Order`;

    callAI(demand, { isGroup: true }).then((text) => {
      // 解析多人推荐
      const sections = text.split(/第\d+位推荐|第\d+杯/);
      const results: ITeaCardData[] = [];
      // 跳过第一个（前置问候）
      for (let i = 1; i < sections.length; i++) {
        const section = sections[i];
        // 从每个 section 提取茶单信息
        const nameMatch = section.match(/饮品名[：:]\s*(.+?)(?:\n|（)/);
        if (nameMatch) {
          const priceMatch = section.match(/价格[：:]\s*¥?(\d+)/);
          const volumeMatch = section.match(/容量[：:]\s*(.+)/);
          const sweetnessMatch = section.match(/推荐甜度[：:]\s*(.+)/);
          const tempMatch = section.match(/推荐温度冰度[：:]\s*(.+)/);
          const toppingsMatch = section.match(/建议小料[：:]\s*(.+)/);
          const orderMatch = section.match(/到店点单暗号[：:]\s*(.+)/);
          const orderEnMatch = section.match(/English Order[：:]\s*(.+)/);
          const reasonMatch = section.match(/推荐理由[：:]\s*(.+)/);
          const nameEnMatch = section.match(/（(.+?)）/);

          results.push({
            drinkName: nameMatch[1].trim(),
            drinkNameEn: nameEnMatch ? nameEnMatch[1].trim() : '',
            price: priceMatch ? parseInt(priceMatch[1], 10) : 0,
            volume: volumeMatch ? volumeMatch[1].trim() : '',
            sweetness: sweetnessMatch ? sweetnessMatch[1].trim() : '',
            temperature: tempMatch ? tempMatch[1].trim() : '',
            toppings: toppingsMatch ? toppingsMatch[1].trim() : '',
            reason: reasonMatch ? reasonMatch[1].trim() : '',
            message: '',
            funFact: '',
            orderPhrase: orderMatch ? orderMatch[1].trim() : '',
            orderPhraseEn: orderEnMatch ? orderEnMatch[1].trim() : '',
            isMain: false,
          });
        }
      }

      if (results.length > 0) {
        setGroupResults(results);
        const total = results.reduce((s, r) => s + r.price, 0);
        setGroupTotalPrice(total);

        // 从文本中找拼单汇总说明
        const summaryMatch = text.match(/拼单汇总[：:]([\s\S]+?)(?=\n\n|$)/);
        if (summaryMatch) {
          setGroupNote(summaryMatch[1].trim().split('\n')[0].slice(0, 80));
        } else {
          setGroupNote(`${members.length}杯已配好，一起下单更方便`);
        }
      } else {
        toast.info('茉莉娘子已搭配好拼单组合，请查看对话');
      }
    });
  };

  // 场景套餐
  const handlePackageSelect = (packageId: string, name: string) => {
    setLoadingPackage(packageId);
    setPackageName(name);
    const demand = `请为「${name}」生成一份套餐推荐，包含3-4款饮品，搭配合理。\n输出要求：\n- 列出每款饮品，格式：【套餐第N款】+ 标准茶单卡字段\n- 最后给出【套餐合计】总价和搭配说明\n- 饮品必须从真实菜单中选择`;

    callAI(demand).then((text) => {
      const sections = text.split(/套餐第\d+款|第\d+款/);
      const results: ITeaCardData[] = [];
      for (let i = 1; i < sections.length; i++) {
        const section = sections[i];
        const nameMatch = section.match(/饮品名[：:]\s*(.+?)(?:\n|（)/);
        if (nameMatch) {
          const priceMatch = section.match(/价格[：:]\s*¥?(\d+)/);
          const volumeMatch = section.match(/容量[：:]\s*(.+)/);
          const sweetnessMatch = section.match(/推荐甜度[：:]\s*(.+)/);
          const tempMatch = section.match(/推荐温度冰度[：:]\s*(.+)/);
          const toppingsMatch = section.match(/建议小料[：:]\s*(.+)/);
          const nameEnMatch = section.match(/（(.+?)）/);
          const reasonMatch = section.match(/推荐理由[：:]\s*(.+)/);

          results.push({
            drinkName: nameMatch[1].trim(),
            drinkNameEn: nameEnMatch ? nameEnMatch[1].trim() : '',
            price: priceMatch ? parseInt(priceMatch[1], 10) : 0,
            volume: volumeMatch ? volumeMatch[1].trim() : '',
            sweetness: sweetnessMatch ? sweetnessMatch[1].trim() : '',
            temperature: tempMatch ? tempMatch[1].trim() : '',
            toppings: toppingsMatch ? toppingsMatch[1].trim() : '',
            reason: reasonMatch ? reasonMatch[1].trim() : '',
            message: '',
            funFact: '',
            isMain: false,
          });
        }
      }

      if (results.length > 0) {
        setPackageResults(results);
        setPackageTotal(results.reduce((s, r) => s + r.price, 0));
      } else {
        toast.info(`${name}已搭配完成，请查看详情`);
      }
      setLoadingPackage('');
    });
  };

  // 榜单饮品点击 → 推荐喝法
  const handleRankDrinkSelect = (drink: IDrinkItem) => {
    setActiveTab('chat');
    setSearchParams({ mode: 'chat' }, { replace: true });
    const demand = `我想喝${drink.name}（¥${drink.price}），请帮我推荐最合适的甜度、冰度和小料搭配，并给我一个到店点单暗号。`;
    setChatMessages((prev) => [...prev, { role: 'user', content: demand }]);
    setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    callAI(demand, { updateChat: true }).then((text) => {
      const { main, alts } = parseTeaCards(text);
      if (main) {
        setMainCard(main);
        setAltCards(alts);
      }
    });
  };

  // 换一杯
  const handleRefresh = () => {
    if (!currentDemand) return;
    const demand = `${currentDemand}\n\n请换一款不同的茶饮推荐，保持相似的风格和定位，但换一个品类或口味。`;
    callAI(demand).then((text) => {
      const { main, alts } = parseTeaCards(text);
      if (main) {
        setMainCard(main);
        setAltCards(alts);
      }
    });
  };

  // 再问问（切到对话模式）
  const handleAskMore = () => {
    setActiveTab('chat');
    setSearchParams({ mode: 'chat' }, { replace: true });
  };

  // 从空态开始
  const handleStart = () => {
    setActiveTab('quiz');
    setSearchParams({ mode: 'quiz' }, { replace: true });
  };

  // 根据当前 tab 决定结果区显示什么
  const renderResultArea = () => {
    // 拼单结果
    if (activeTab === 'group' && groupResults.length > 0) {
      return (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">拼单结果</h3>
            </div>
            <Badge className="bg-primary/10 text-primary border-0">
              共 {groupResults.length} 杯
            </Badge>
          </div>
          {groupNote && (
            <div className="text-sm text-primary bg-primary/5 px-3 py-2 rounded-lg border border-primary/20">
              ✨ {groupNote}
            </div>
          )}
          <div className="space-y-3">
            {groupResults.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                    {groupMembers[i]?.nickname || `${i + 1} 号`}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                    {groupMembers[i]?.demand}
                  </span>
                </div>
                <TeaCard data={{ ...card, isMain: i === 0 }} onConfirm={() => handleConfirmDrink(card)} />
              </motion.div>
            ))}
          </div>
          <div className="pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">拼单合计</span>
              <span className="text-2xl font-black text-primary">
                ¥{groupTotalPrice}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // 套餐结果
    if (activeTab === 'packages' && packageResults.length > 0) {
      return (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">{packageName}</h3>
            </div>
            <Badge className="bg-primary/10 text-primary border-0">
              {packageResults.length} 杯套餐
            </Badge>
          </div>
          <div className="space-y-3">
            {packageResults.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                    套餐第 {i + 1} 款
                  </Badge>
                </div>
                <TeaCard data={{ ...card, isMain: i === 0 }} onConfirm={() => handleConfirmDrink(card)} />
              </motion.div>
            ))}
          </div>
          <div className="pt-3 border-t border-border/40">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">套餐合计</span>
              <span className="text-2xl font-black text-primary">¥{packageTotal}</span>
            </div>
          </div>
        </div>
      );
    }

    // 榜单结果区：提示 + 空态
    if (activeTab === 'ranking') {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center py-12 px-6">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Trophy className="size-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground">茉莉点单榜</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xs">
            点击左侧任意一款，让茉莉娘子为你定制喝法
          </p>
        </div>
      );
    }

    // 加载中展示茉莉娘子口吻文案
    if (isLoading && !mainCard) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center py-16 px-6">
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
            <Leaf className="size-8 text-primary" />
          </div>
          <p className="text-sm text-foreground font-medium">{loadingPhrase}</p>
          <p className="text-xs text-muted-foreground mt-2">请稍等，马上就好</p>
        </div>
      );
    }

    // 默认：茶单卡结果（四问/对话共用）
    return (
      <TeaCardResultSection
         mainCard={mainCard}
         altCards={altCards}
         isLoading={isLoading}
         onRefresh={handleRefresh}
         onAskMore={handleAskMore}
         onStart={handleStart}
         onConfirm={handleConfirmDrink}
         onNameChange={handleNameChange}
       />
    );
  };

  const hasDietaryNote =
    profile.dietary.length > 0 &&
    !(profile.dietary.length === 1 && profile.dietary.includes('none'));

  // 应季提示图标
  const SeasonIcon =
    seasonTip.icon === '☀️' ? Sun
      : seasonTip.icon === '🔥' ? Flame
      : seasonTip.icon === '🍂' ? Leaf
      : Flower2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* 页面标题 */}
      <section className="w-full pt-10 md:pt-14 pb-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
              <Sparkles className="size-3.5" />
              {timeGreeting.greeting} 我是茉莉娘子
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              和 <span className="text-primary">茉莉娘子</span> 一起，选杯好茶
            </h1>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              {timeGreeting.tip} · 四问选茶 / 自由对话 / 多人拼单 / 场景套餐
            </p>
             <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
               <ProfileEditor profile={profile} onSave={saveProfile} />
               <OrderHistoryPanel
                 orders={orders as any}
                 onReorder={handleReorder}
                 onClear={clearOrders}
                 trigger={
                   <Button variant="outline" size="sm" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
                     <History className="size-4" />
                     我的点单
                     {orders.length > 0 && (
                       <span className="ml-0.5 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 min-w-[18px]">
                         {orders.length}
                       </span>
                     )}
                   </Button>
                 }
               />
               {hasDietaryNote && (
                 <Badge variant="outline" className="border-destructive/30 text-destructive text-xs">
                   已设 {profile.dietary.length} 项忌口
                 </Badge>
               )}
             </div>

             {/* 快捷入口卡片 */}
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, delay: 0.4 }}
               className="mt-4 flex items-center justify-center gap-2 flex-wrap"
             >
               <Link
                 to="/personality"
                 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 text-xs font-medium hover:bg-fuchsia-100 transition-colors"
               >
                 <Wand2 className="size-3.5" />
                 三题帮你选一杯
                 <span className="text-[9px] bg-fuchsia-200 px-1 rounded text-fuchsia-800">NEW</span>
               </Link>
               <button
                 onClick={() => navigate('/')}
                 className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium hover:bg-teal-100 transition-colors"
               >
                 <Bookmark className="size-3.5" />
                 每日推荐
               </button>
              </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 text-sm text-foreground"
            >
              <span className="text-base">{seasonTip.icon}</span>
              <span className="text-primary font-medium">{seasonTip.season}</span>
              <span className="text-foreground/80">{seasonTip.tip}</span>
            </motion.div>
          </motion.div>
        </div>
       </section>

      {/* 场景快选条 */}
      <section className="w-full bg-gradient-to-b from-primary/5 to-transparent py-3">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <YoungScenesStrip
            variant="ai"
            onSelect={(scene: YoungScene) => {
              if (activeTab !== 'chat') {
                setActiveTab('chat');
                setSearchParams({ mode: 'chat' }, { replace: true });
              }
              handleChatSubmit(scene.demand);
            }}
          />
        </div>
      </section>

      {/* 主体内容区 */}
      <section className="w-full pb-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* 左侧交互区 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card className="border-primary/20 shadow-sm h-full flex flex-col">
                <CardContent className="p-5 flex-1 flex flex-col">
                  <Tabs
                    value={activeTab}
                    onValueChange={handleTabChange}
                    className="flex-1 flex flex-col"
                  >
                    <TabsList className="grid grid-cols-5 w-full mb-5">
                      <TabsTrigger
                        value="quiz"
                        className="gap-1 data-[state=active]:text-primary text-xs flex-col py-2"
                      >
                        <Sparkles className="size-4" />
                        <span className="hidden sm:inline">四问选茶</span>
                        <span className="sm:hidden">四问</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="chat"
                        className="gap-1 data-[state=active]:text-primary text-xs flex-col py-2"
                      >
                        <MessageCircle className="size-4" />
                        <span className="hidden sm:inline">自由对话</span>
                        <span className="sm:hidden">对话</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="group"
                        className="gap-1 data-[state=active]:text-primary text-xs flex-col py-2"
                      >
                        <Users className="size-4" />
                        <span className="hidden sm:inline">多人拼单</span>
                        <span className="sm:hidden">拼单</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="packages"
                        className="gap-1 data-[state=active]:text-primary text-xs flex-col py-2"
                      >
                        <Grid3X3 className="size-4" />
                        <span className="hidden sm:inline">场景套餐</span>
                        <span className="sm:hidden">套餐</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="ranking"
                        className="gap-1 data-[state=active]:text-primary text-xs flex-col py-2"
                      >
                        <Trophy className="size-4" />
                        <span className="hidden sm:inline">点单榜</span>
                        <span className="sm:hidden">榜单</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent
                      value="quiz"
                      className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden"
                    >
                      <FourQuestionSection
                        onSubmit={handleQuizSubmit}
                        isLoading={isLoading}
                      />
                    </TabsContent>

                    <TabsContent
                      value="chat"
                      className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden min-h-[480px]"
                    >
                      <FreeChatSection
                        onSubmit={handleChatSubmit}
                        isLoading={isLoading}
                        messages={chatMessages}
                      />
                    </TabsContent>

                    <TabsContent
                      value="group"
                      className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden"
                    >
                      <GroupOrderSection
                        onSubmit={handleGroupSubmit}
                        isLoading={isLoading}
                      />
                    </TabsContent>

                    <TabsContent
                      value="packages"
                      className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden"
                    >
                      <ScenePackagesSection
                        onSelect={handlePackageSelect}
                        isLoading={isLoading}
                        loadingPackage={loadingPackage}
                      />
                    </TabsContent>

                    <TabsContent
                      value="ranking"
                      className="flex-1 flex flex-col mt-0 data-[state=inactive]:hidden max-h-[600px] overflow-y-auto"
                    >
                      <RankingSection onSelectDrink={handleRankDrinkSelect} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>

            {/* 右侧结果区 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-3"
            >
              <Card className="border-primary/20 shadow-sm h-full">
                <CardContent className="p-5">{renderResultArea()}</CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
       </section>

      {/* 点单小票弹窗 */}
      <OrderReceipt
         card={receiptCard}
         open={receiptOpen}
         onOpenChange={setReceiptOpen}
         onConfirm={handleReceiptConfirm}
         onNameChange={handleReceiptNameChange}
       />
    </div>
  );
}
