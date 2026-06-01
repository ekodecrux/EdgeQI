export interface TraceableRequirement {
  id: string;
  title: string;
  content: string;
  module: string;
  isImplemented: boolean;
  status: 'Implemented' | 'In Progress' | 'Pending Validation' | 'Draft';
  mappedTestCases: string[];
  isAutomated: boolean;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
}

const moduleSpecs: { module: string; items: any[] }[] = [];

export const getTraceabilityRequirements = (): TraceableRequirement[] => {
  const result: TraceableRequirement[] = [];
  moduleSpecs.forEach((mSpec) => {
    mSpec.items.forEach((it) => {
      const reqId = `REQ-${it.id.toString().padStart(3, '0')}`;
      result.push({
        id: reqId,
        title: it.title,
        content: it.content,
        module: mSpec.module,
        priority: it.priority as 'P0' | 'P1' | 'P2' | 'P3',
        status: it.status as 'Implemented' | 'In Progress' | 'Pending Validation' | 'Draft',
        isImplemented: it.isImplemented,
        mappedTestCases: [it.tc],
        isAutomated: it.isAutomated
      });
    });
  });
  return result;
};
