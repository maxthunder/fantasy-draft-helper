#!/usr/bin/env python3
import json
import re
from urllib.parse import unquote
import time

def extract_player_name_from_url(url):
    match = re.search(r'search\?q=(.+)$', url)
    if match:
        return unquote(match.group(1))
    return None

def load_players_data():
    with open('data/players.json', 'r') as f:
        return json.load(f)

def save_players_data(data):
    with open('data/players.json', 'w') as f:
        json.dump(data, f, indent=2)

def get_players_needing_update(players):
    players_to_update = []
    for player in players:
        if 'fantasyDataUrl' in player and 'search?q=' in player['fantasyDataUrl']:
            player_name = extract_player_name_from_url(player['fantasyDataUrl'])
            if player_name:
                players_to_update.append({
                    'name': player['name'],
                    'search_name': player_name,
                    'current_url': player['fantasyDataUrl']
                })
    return players_to_update

def main():
    print("Loading player data...")
    players = load_players_data()
    
    players_to_update = get_players_needing_update(players)
    print(f"Found {len(players_to_update)} players with search URLs that need updating")
    
    # Print first 10 for verification
    print("\nFirst 10 players that need URL updates:")
    for player in players_to_update[:10]:
        print(f"  - {player['name']} (search: {player['search_name']})")
    
    print(f"\nTotal players to update: {len(players_to_update)}")
    
    # Create a mapping file for manual URL collection
    with open('players_to_update.json', 'w') as f:
        json.dump(players_to_update, f, indent=2)
    print("\nCreated players_to_update.json with all players needing URL updates")

if __name__ == "__main__":
    main()