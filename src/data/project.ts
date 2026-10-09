// EXPORTS: IProjectSection, ITeamMember, IProjectHighlight, MOCK_PROJECT_OVERVIEW, MOCK_PROJECT_PAIN_POINTS, MOCK_PROJECT_HIGHLIGHTS, MOCK_TEAM_MEMBERS, MOCK_PROJECT_CONTACT
export interface IProjectSection {
  id: string
  title: string
  subtitle?: string
  content: string
}

export interface IProjectHighlight {
  id: string
  title: string
  description: string
  icon: string
}

export interface ITeamMember {
  id: string
  role: string
  name: string
  description: string
  avatarUrl: string
}

// 项目背景与品牌简介
export const MOCK_PROJECT_OVERVIEW: IProjectSection = {
  id: '1',
  title: '项目背景与品牌简介',
  subtitle: '极萃东方茉莉 · 让茉莉花香成为东方茶客日常的温暖记忆',
  content: '2022年创立于"世界茉莉花都"——广西横州市。专注使用横州茉莉花茶底，融合传统窨制工艺与现代茶饮创意。现有横州6家门店、全国22家，产品线覆盖鲜奶茶、果茶、纯茶、咖啡及茉莉手信等84款饮品。'
}

// 智能体价值与痛点
export const MOCK_PROJECT_PAIN_POINTS: IProjectSection[] = [
  {
    id: '1',
    title: '选择困难',
    content: '84款饮品琳琅满目，顾客点单时犹豫不决'
  },
  {
    id: '2',
    title: '排队点单慢',
    content: '高峰期门店拥挤，顾客等待时间过长'
  },
  {
    id: '3',
    title: '个性化不足',
    content: '标准化菜单难以满足每个人的口味与场景需求'
  },
  {
    id: '4',
    title: '文化触达弱',
    content: '横州茉莉与窨制工艺的深厚文化底蕴难以传递给消费者'
  }
]

// 特色与长处
export const MOCK_PROJECT_HIGHLIGHTS: IProjectHighlight[] = [
  {
    id: '1',
    title: 'IP人格化',
    description: '茉莉娘子温婉人设，差异化情感连接',
    icon: '🌸'
  },
  {
    id: '2',
    title: '84款真实菜单',
    description: '完整真实饮品知识库，AI只从菜单选品',
    icon: '🍵'
  },
  {
    id: '3',
    title: '四维匹配',
    description: '心情-场景-口味-健康智能匹配推荐',
    icon: '🎯'
  },
  {
    id: '4',
    title: '社交茶单卡',
    description: '新中式茶单卡设计，一键分享传播',
    icon: '📱'
  },
  {
    id: '5',
    title: '中英双语',
    description: '雅致英文译名，呼应品牌出海战略',
    icon: '🌏'
  },
  {
    id: '6',
    title: '轻量架构',
    description: '学生团队可快速落地迭代，成本可控',
    icon: '⚡'
  }
]

// 团队分工
export const MOCK_TEAM_MEMBERS: ITeamMember[] = [
  {
    id: '1',
    role: '产品 / AI训练',
    name: '待补充',
    description: '负责产品设计与AI智能体训练',
    avatarUrl: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/1.jpg'
  },
  {
    id: '2',
    role: '前端交互',
    name: '待补充',
    description: '负责Web应用前端开发与交互体验',
    avatarUrl: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/2.jpg'
  },
  {
    id: '3',
    role: '内容与菜单知识库',
    name: '待补充',
    description: '负责84款菜单数据整理与内容运营',
    avatarUrl: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/3.jpg'
  },
  {
    id: '4',
    role: '视觉与IP运营',
    name: '待补充',
    description: '负责茉莉娘子IP视觉设计与品牌视觉',
    avatarUrl: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/4.jpg'
  },
  {
    id: '5',
    role: '调研与商业分析',
    name: '待补充',
    description: '负责市场调研与商业模式分析',
    avatarUrl: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/5.jpg'
  },
  {
    id: '6',
    role: '指导老师',
    name: '待补充',
    description: '项目指导与专业顾问',
    avatarUrl: 'https://lf3-static.bytednsdoc.com/obj/eden-cn/ylcylz_fsph_ryhs/ljhwZthlaukjlkulzlp/feisuda/avatar/base/6.jpg'
  }
]

// 联系方式
export const MOCK_PROJECT_CONTACT: IProjectSection = {
  id: 'contact',
  title: '联系方式',
  subtitle: '欢迎交流合作',
  content: '项目负责人：覃静 15778373666\n项目地址：广西横州市极萃园中国茉莉花馆二楼'
}