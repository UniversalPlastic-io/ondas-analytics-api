import { Injectable } from '@nestjs/common';
import * as client from './marketplace-client';

function byUsername(items: unknown[], username?: string): unknown[] {
  if (!username) return items;
  const u = username.trim().toLowerCase();
  return items.filter((it) => {
    const user = (it as { user?: { username?: unknown } })?.user;
    return typeof user?.username === 'string' && user.username.toLowerCase() === u;
  });
}

@Injectable()
export class MarketplaceService {
  async getCampaigns(username?: string): Promise<unknown[]> {
    return byUsername((await client.fetchHome()).campaigns, username);
  }

  async getCleanups(username?: string): Promise<unknown[]> {
    return byUsername((await client.fetchHome()).wasteCollections, username);
  }

  async getOrganizations(): Promise<unknown[]> {
    return (await client.fetchHome()).organizations;
  }
}
