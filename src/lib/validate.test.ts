import { expect, it } from 'vitest';
import { makeProject } from './templates';
import { validate } from './validate';
import { defaultFlow } from './defaults';

it('flags unprotected cross-zone confidential data and clears those warnings when protected', () => {
  const tab = makeProject(true).tabs[0];
  tab.nodes[0].zone = '외부'; tab.nodes[1].zone = '내부';
  const flow = tab.flows[0]; flow.classification = 'confidential'; flow.protection = 'none';
  expect(validate(tab).filter((warning) => warning.flowId === flow.id).map((warning) => warning.message)).toEqual([
    '영역 간 전송 보호조치 확인 필요', '중요 정보의 전송 보호조치 확인 필요',
  ]);
  flow.protection = 'tls';
  expect(validate(tab).filter((warning) => warning.flowId === flow.id)).toEqual([]);
});

it('treats unknown classification and protection as missing, not safe', () => {
  const tab = makeProject(true).tabs[0];
  tab.flows = [{ ...defaultFlow(tab.nodes[0].id, tab.nodes[1].id), id: 'draft' }];
  expect(validate(tab).filter((warning) => warning.flowId === 'draft').map((warning) => warning.message)).toEqual([
    '정보 흐름명 미지정', '정보 흐름 데이터 항목 미지정', '정보 분류 미지정', '전송 보호조치 미지정',
  ]);
  Object.assign(tab.flows[0], { name: '흐름', dataItems: ['항목'], classification: 'public', protection: 'tls' });
  expect(validate(tab).filter((warning) => warning.flowId === 'draft')).toEqual([]);
});
