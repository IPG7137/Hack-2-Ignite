import { IDepartmentService } from './api.interface';
import { Department, WardInfo } from '../types/department';
import { FieldTeam } from '../types/officer';
import { MOCK_DEPARTMENTS, MOCK_WARDS } from './mock/departmentsMock';
import { MOCK_FIELD_TEAMS } from './mock/fieldTeamsMock';

class MockDepartmentService implements IDepartmentService {
  async getDepartments(): Promise<Department[]> {
    await new Promise((res) => setTimeout(res, 30));
    return [...MOCK_DEPARTMENTS];
  }

  async getWards(): Promise<WardInfo[]> {
    await new Promise((res) => setTimeout(res, 20));
    return [...MOCK_WARDS];
  }

  async getFieldTeams(): Promise<FieldTeam[]> {
    await new Promise((res) => setTimeout(res, 30));
    return [...MOCK_FIELD_TEAMS];
  }
}

export const departmentService = new MockDepartmentService();
