import { APP_ROUTES } from '../../shared/navigation/routes'
import { createAppRouteUrl } from '../../shared/navigation/routeUrl'

import type { ExpressInsuranceRuleView } from './insuranceRule.types'
import type { ExpressInsuranceRuleType } from './types'

const RULES: Record<ExpressInsuranceRuleType, ExpressInsuranceRuleView> = {
  NORMAL: {
    type: 'NORMAL',
    title: '基础保',
    summary:
      '适用于常规托寄物。发生丢失或破损时，赔付以保价声明价值、货物实际价值和实际损失为基础综合判定。',
    badgeText: '常用',
    sections: [
      {
        title: '收费规则',
        content: [
          '快递产品按保价声明金额阶梯计费，常规货物 5000 元及以下参考 4‰，5000 元以上参考 5‰。',
          '零担产品通常赠送 2000 元基础保障，超过部分参考 6‰ 计费。',
          '易碎易损类货品费率更高，页面试算结果仅作预估，最终以收派员或网点开单为准。'
        ],
        table: {
          title: '参考费率',
          headers: ['产品', '保价声明', '参考标准'],
          rows: [
            {
              cells: ['快递', '5000 元及以下', '4‰']
            },
            {
              cells: ['快递', '5000 元以上', '5‰']
            },
            {
              cells: ['零担', '2000 元及以下', '赠送']
            },
            {
              cells: ['零担', '2000 元以上', '超出部分 6‰']
            },
            {
              cells: ['易碎易损', '按货物核实', '8‰ 起'],
              tone: 'warning'
            }
          ],
          note: '不同产品、城市、货物品类和活动规则可能影响最终保费。'
        }
      },
      {
        title: '赔付规则',
        content: [
          '已选择保价时，在保价声明价值范围内按电子运单服务协议赔偿直接损失，间接损失不予赔付。',
          '未足额或等额投保时，全部损毁或灭失按保价声明价值赔偿；部分损坏按声明价值和损失比例赔偿。',
          '超额投保时，赔付不会超过货物实际价值；可维修或更换的，以维修、更换费用作为损失基础。',
          '未保价时，按对应基础运费倍数和协议上限赔付，国际运输、整车等特殊产品以对应产品规则为准。'
        ]
      }
    ]
  },
  QEB: {
    type: 'QEB',
    title: '全额保',
    summary:
      '面向足额投保的高价值托寄物。全部丢失或损坏时，可在保价金额内按实际损失优先处理。',
    badgeText: '高价值',
    sections: [
      {
        title: '服务说明',
        content: [
          '全额保强调按实际价值足额投保，适合价值明确且希望提升理赔确定性的托寄物。',
          '足额投保并发生承保范围内损失时，按实际损失金额赔偿，最高不超过保价金额。'
        ]
      },
      {
        title: '示例规则',
        content: [
          '若托寄物价值 3000 元、维修损失 1000 元，足额投保时可按实际损失和规则补偿。',
          '若仅投保 2000 元，赔付仍受保价金额和实际损失限制。',
          '未保价时，通常只能按电子运单服务协议中的未保价规则处理。'
        ],
        table: {
          title: '赔付示例',
          headers: ['场景', '声明金额', '处理口径'],
          rows: [
            {
              cells: ['足额投保', '3000 元', '按实际损失，最高不超过声明金额']
            },
            {
              cells: ['不足额投保', '2000 元', '按损失与声明金额限制处理']
            },
            {
              cells: ['未保价', '无', '按未保价协议上限处理'],
              tone: 'warning'
            }
          ]
        }
      },
      {
        title: '重要提示',
        content: [
          '请按托寄物实际价值申报，虚高或虚低都可能影响后续理赔。',
          '全新托寄物、维修价格、折旧和残值等材料以后端或理赔人员审核为准。'
        ]
      }
    ]
  },
  SXB: {
    type: 'SXB',
    title: '省心保',
    summary:
      '面向票据、合同、证件、会员卡等难以衡量公允价值的托寄物，按固定保价金额提供简化保障。',
    badgeText: '证件文件',
    sections: [
      {
        title: '服务说明',
        content: [
          '省心保适合证件、票据、合同等价值证明较难提供的文件类或卡证类物品。',
          '发生全部丢失或损坏时，可按保价金额处理；部分损坏按规则比例处理。'
        ]
      },
      {
        title: '赔付示例',
        content: [
          '例如邮寄身份证并选择 500 元省心保，全部丢失时按保价金额处理。',
          '若发生折损且影响使用或外观，按具体情形和规则比例处理。'
        ],
        table: {
          title: '参考口径',
          headers: ['场景', '声明金额', '处理口径'],
          rows: [
            {
              cells: ['全部丢失', '500 元', '按保价金额处理']
            },
            {
              cells: ['部分折损', '500 元', '参考保价金额 50% 处理']
            },
            {
              cells: ['未保价', '无', '按未保价协议上限处理'],
              tone: 'warning'
            }
          ]
        }
      },
      {
        title: '使用提示',
        content: [
          '有形证件弯曲折损可能被视作损坏，普通文件轻微弯曲是否构成损坏以后续审核为准。',
          '省心保不替代禁寄品、限寄品和包装要求校验，寄件前仍需确认货物合规。'
        ]
      }
    ]
  }
}

function normalizeRuleType(value?: string): ExpressInsuranceRuleType {
  if (value === 'QEB' || value === 'SXB') {
    return value
  }

  return 'NORMAL'
}

export const expressInsuranceRules = {
  getRuleTypes() {
    return Object.values(RULES).map((item) => ({
      type: item.type,
      title: item.title,
      badgeText: item.badgeText
    }))
  },

  getRule(value?: string) {
    return RULES[normalizeRuleType(value)]
  },

  createRuleRoute(type: ExpressInsuranceRuleType = 'NORMAL') {
    return createAppRouteUrl(APP_ROUTES.expressInsurance, {
      type
    })
  }
}
