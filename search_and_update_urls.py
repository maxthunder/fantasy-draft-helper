#!/usr/bin/env python3
import json
import time
from urllib.parse import unquote

# Manual mapping of player names to their FantasyData URLs
# Found through web searches
player_url_mapping = {
    "Bo Nix": "https://fantasydata.com/nfl/bo-nix-fantasy/25069",
    "Dak Prescott": "https://fantasydata.com/nfl/dak-prescott-fantasy/18055",
    "Baker Mayfield": "https://fantasydata.com/nfl/baker-mayfield-fantasy/19790",
    "Brock Purdy": "https://fantasydata.com/nfl/brock-purdy-fantasy/23241",
    "Jordan Love": "https://fantasydata.com/nfl/jordan-love-fantasy/21841",
    "Jared Goff": "https://fantasydata.com/nfl/jared-goff-fantasy/17922",
    "Caleb Williams": "https://fantasydata.com/nfl/caleb-williams-fantasy/24927",
    "Tua Tagovailoa": "https://fantasydata.com/nfl/tua-tagovailoa-fantasy/21677",
    "Justin Herbert": "https://fantasydata.com/nfl/justin-herbert-fantasy/21681",
    "Jalen Hurts": "https://fantasydata.com/nfl/jalen-hurts-fantasy/21831",
    "Matthew Stafford": "https://fantasydata.com/nfl/matthew-stafford-fantasy/9038",
    "Kyler Murray": "https://fantasydata.com/nfl/kyler-murray-fantasy/20889",
    "Aaron Rodgers": "https://fantasydata.com/nfl/aaron-rodgers-fantasy/2593",
    "Russell Wilson": "https://fantasydata.com/nfl/russell-wilson-fantasy/14536",
    "Trevor Lawrence": "https://fantasydata.com/nfl/trevor-lawrence-fantasy/22490",
    "Anthony Richardson": "https://fantasydata.com/nfl/anthony-richardson-fantasy/24117",
    "Drake Maye": "https://fantasydata.com/nfl/drake-maye-fantasy/24958",
    "J.J. McCarthy": "https://fantasydata.com/nfl/jj-mccarthy-fantasy/24956",
    "Michael Penix Jr.": "https://fantasydata.com/nfl/michael-penix-jr-fantasy/23242",
    "Ashton Jeanty": "https://fantasydata.com/nfl/ashton-jeanty-fantasy/25868",
    "Lamar Jackson": "https://fantasydata.com/nfl/lamar-jackson-fantasy/19781",
    "Josh Allen": "https://fantasydata.com/nfl/josh-allen-fantasy/19801",
    # Running Backs
    "Breece Hall": "https://fantasydata.com/nfl/breece-hall-fantasy/22526",
    "Alvin Kamara": "https://fantasydata.com/nfl/alvin-kamara-fantasy/18878",
    "Brian Robinson Jr.": "https://fantasydata.com/nfl/brian-robinson-jr-fantasy/23190",
    "Bucky Irving": "https://fantasydata.com/nfl/bucky-irving-fantasy/24967",
    "Antonio Gibson": "https://fantasydata.com/nfl/antonio-gibson-fantasy/21861",
    "Austin Ekeler": "https://fantasydata.com/nfl/austin-ekeler-fantasy/19562",
    "Aaron Jones": "https://fantasydata.com/nfl/aaron-jones-fantasy/19045",
    # Wide Receivers
    "Brandon Aiyuk": "https://fantasydata.com/nfl/brandon-aiyuk-fantasy/21747",
    "Calvin Ridley": "https://fantasydata.com/nfl/calvin-ridley-fantasy/19802",
    "Amari Cooper": "https://fantasydata.com/nfl/amari-cooper-fantasy/16765",
    "Brian Thomas Jr.": "https://fantasydata.com/nfl/brian-thomas-jr-fantasy/24933",
    "Adam Thielen": "https://fantasydata.com/nfl/adam-thielen-fantasy/15534",
    "Brandin Cooks": "https://fantasydata.com/nfl/brandin-cooks-fantasy/16568",
    "Alec Pierce": "https://fantasydata.com/nfl/alec-pierce-fantasy/23232",
    "Chris Olave": "https://fantasydata.com/nfl/chris-olave-fantasy/22565",
    "Cooper Kupp": "https://fantasydata.com/nfl/cooper-kupp-fantasy/18882",
    "Courtland Sutton": "https://fantasydata.com/nfl/courtland-sutton-fantasy/19800",
    "Davante Adams": "https://fantasydata.com/nfl/davante-adams-fantasy/16470",
    "DK Metcalf": "https://fantasydata.com/nfl/dk-metcalf-fantasy/20875",
    "DeAndre Hopkins": "https://fantasydata.com/nfl/deandre-hopkins-fantasy/14986",
    "Deebo Samuel Sr.": "https://fantasydata.com/nfl/deebo-samuel-sr-fantasy/20932",
    "Diontae Johnson": "https://fantasydata.com/nfl/diontae-johnson-fantasy/21077",
    "Drake London": "https://fantasydata.com/nfl/drake-london-fantasy/23151",
    "Garrett Wilson": "https://fantasydata.com/nfl/garrett-wilson-fantasy/23122",
    "George Pickens": "https://fantasydata.com/nfl/george-pickens-fantasy/23153",
    "Ja'Marr Chase": "https://fantasydata.com/nfl/ja-marr-chase-fantasy/22564",
    "Jaxon Smith-Njigba": "https://fantasydata.com/nfl/jaxon-smith-njigba-fantasy/23157",
    "Jaylen Waddle": "https://fantasydata.com/nfl/jaylen-waddle-fantasy/22598",
    "Jaylen Warren": "https://fantasydata.com/nfl/jaylen-warren-fantasy/23479",
    # More Running Backs
    "Christian McCaffrey": "https://fantasydata.com/nfl/christian-mccaffrey-fantasy/18877",
    "Derrick Henry": "https://fantasydata.com/nfl/derrick-henry-fantasy/17959",
    "Jahmyr Gibbs": "https://fantasydata.com/nfl/jahmyr-gibbs-fantasy/23200",
    "James Cook": "https://fantasydata.com/nfl/james-cook-fantasy/23247",
    "James Conner": "https://fantasydata.com/nfl/james-conner-fantasy/18983",
    "Jerome Ford": "https://fantasydata.com/nfl/jerome-ford-fantasy/23205",
    "Jonathan Taylor": "https://fantasydata.com/nfl/jonathan-taylor-fantasy/21682",
    "Josh Jacobs": "https://fantasydata.com/nfl/josh-jacobs-fantasy/20824",
    "Kenneth Walker III": "https://fantasydata.com/nfl/kenneth-walker-iii-fantasy/23214",
    "Saquon Barkley": "https://fantasydata.com/nfl/saquon-barkley-fantasy/19766",
    "Travis Etienne Jr.": "https://fantasydata.com/nfl/travis-etienne-jr-fantasy/21696",
    "Zach Charbonnet": "https://fantasydata.com/nfl/zach-charbonnet-fantasy/23173",
    # Tight Ends
    "Cade Otton": "https://fantasydata.com/nfl/cade-otton-fantasy/23134",
    "Dalton Kincaid": "https://fantasydata.com/nfl/dalton-kincaid-fantasy/24102",
    "David Njoku": "https://fantasydata.com/nfl/david-njoku-fantasy/18876",
    # More Wide Receivers
    "Mike Evans": "https://fantasydata.com/nfl/mike-evans-fantasy/16597",
    "Nico Collins": "https://fantasydata.com/nfl/nico-collins-fantasy/21756",
    "Puka Nacua": "https://fantasydata.com/nfl/puka-nacua-fantasy/24172",
    "Rashee Rice": "https://fantasydata.com/nfl/rashee-rice-fantasy/24120",
    "Rome Odunze": "https://fantasydata.com/nfl/rome-odunze-fantasy/24977",
    "Stefon Diggs": "https://fantasydata.com/nfl/stefon-diggs-fantasy/16906",
    "Tank Dell": "https://fantasydata.com/nfl/tank-dell-fantasy/24176",
    "Tee Higgins": "https://fantasydata.com/nfl/tee-higgins-fantasy/21690",
    "Terry McLaurin": "https://fantasydata.com/nfl/terry-mclaurin-fantasy/20873",
    "Tyler Lockett": "https://fantasydata.com/nfl/tyler-lockett-fantasy/16830",
    "Wan'Dale Robinson": "https://fantasydata.com/nfl/wan-dale-robinson-fantasy/23170",
    "Xavier Worthy": "https://fantasydata.com/nfl/xavier-worthy-fantasy/24924",
    "Zay Flowers": "https://fantasydata.com/nfl/zay-flowers-fantasy/23120",
    # More Running Backs
    "Najee Harris": "https://fantasydata.com/nfl/najee-harris-fantasy/21768",
    "Nick Chubb": "https://fantasydata.com/nfl/nick-chubb-fantasy/19798",
    "Rachaad White": "https://fantasydata.com/nfl/rachaad-white-fantasy/23217",
    "Rhamondre Stevenson": "https://fantasydata.com/nfl/rhamondre-stevenson-fantasy/22546",
    "Rico Dowdle": "https://fantasydata.com/nfl/rico-dowdle-fantasy/21952",
    "Tony Pollard": "https://fantasydata.com/nfl/tony-pollard-fantasy/20912",
    "Tyjae Spears": "https://fantasydata.com/nfl/tyjae-spears-fantasy/24123",
    "Tyler Allgeier": "https://fantasydata.com/nfl/tyler-allgeier-fantasy/23250",
    "Zack Moss": "https://fantasydata.com/nfl/zack-moss-fantasy/21784",
    "Zamir White": "https://fantasydata.com/nfl/zamir-white-fantasy/22539",
    # More Tight Ends
    "T.J. Hockenson": "https://fantasydata.com/nfl/t-j-hockenson-fantasy/20805",
    "Pat Freiermuth": "https://fantasydata.com/nfl/pat-freiermuth-fantasy/22507",
    "Tucker Kraft": "https://fantasydata.com/nfl/tucker-kraft-fantasy/24118",
    # Kickers
    "Brandon Aubrey": "https://fantasydata.com/nfl/brandon-aubrey-fantasy/24902",
    "Tyler Bass": "https://fantasydata.com/nfl/tyler-bass-fantasy/22108",
    "Younghoe Koo": "https://fantasydata.com/nfl/younghoe-koo-fantasy/19565",
    # Team Defenses
    "Baltimore Ravens": "https://fantasydata.com/nfl/baltimore-ravens-roster",
    "Buffalo Bills": "https://fantasydata.com/nfl/buffalo-bills-roster", 
    "Pittsburgh Steelers": "https://fantasydata.com/nfl/pittsburgh-steelers-depth-chart",
    "San Francisco 49ers": "https://fantasydata.com/nfl/san-francisco-49ers-roster",
    "New York Jets": "https://fantasydata.com/nfl/new-york-jets-roster",
    # More Players
    "Andrei Iosivas": "https://fantasydata.com/nfl/andrei-iosivas-fantasy/24119",
    "Audric Estime": "https://fantasydata.com/nfl/audric-estime-fantasy/24971",
    "Bhayshul Tuten": "https://fantasydata.com/nfl/bhayshul-tuten-fantasy/25898",
    "Braelon Allen": "https://fantasydata.com/nfl/braelon-allen-fantasy/24934",
    "Cam Akers": "https://fantasydata.com/nfl/cam-akers-fantasy/21688",
    "Elijah Mitchell": "https://fantasydata.com/nfl/eli-mitchell-fantasy/22535",
    "Gus Edwards": "https://fantasydata.com/nfl/gus-edwards-fantasy/20239",
    "Jameson Williams": "https://fantasydata.com/nfl/jameson-williams-fantasy/23234",
    "Javonte Williams": "https://fantasydata.com/nfl/javonte-williams-fantasy/22558",
    "Jonnu Smith": "https://fantasydata.com/nfl/jonnu-smith-fantasy/18990",
    "Jordan Addison": "https://fantasydata.com/nfl/jordan-addison-fantasy/23162",
    "Jordan Mason": "https://fantasydata.com/nfl/jordan-mason-fantasy/23364",
    "Keenan Allen": "https://fantasydata.com/nfl/keenan-allen-fantasy/15076",
    "Khalil Shakir": "https://fantasydata.com/nfl/khalil-shakir-shakir-fantasy/23227",
    "Ladd McConkey": "https://fantasydata.com/nfl/ladd-mcconkey-fantasy/25097",
    "Marvin Harrison Jr.": "https://fantasydata.com/nfl/marvin-harrison-jr-fantasy/24974",
    "Romeo Doubs": "https://fantasydata.com/nfl/romeo-doubs-fantasy/23167",
    "Roschon Johnson": "https://fantasydata.com/nfl/roschon-johnson-fantasy/24372",
    "Tank Bigsby": "https://fantasydata.com/nfl/tank-bigsby-fantasy/23193",
    "Trey Benson": "https://fantasydata.com/nfl/trey-benson-fantasy/24292",
    "Quentin Johnston": "https://fantasydata.com/nfl/quentin-johnston-fantasy/24226",
    "Quinshon Judkins": "https://fantasydata.com/ncaa-football/quinshon-judkins-fantasy/50071844",
    "Rashod Bateman": "https://fantasydata.com/nfl/rashod-bateman-fantasy/22623",
    "Tyler Boyd": "https://fantasydata.com/nfl/tyler-boyd-fantasy/17986",
    "Tyler Warren": "https://fantasydata.com/nfl/tyler-warren-fantasy/25874",
    "Mike Williams": "https://fantasydata.com/nfl/mike-williams-fantasy/18914",
    "Nelson Agholor": "https://fantasydata.com/nfl/nelson-agholor-fantasy/16781",
    "Noah Brown": "https://fantasydata.com/nfl/noah-brown-fantasy/19080",
    "Tutu Atwell": "https://fantasydata.com/nfl/tutu-atwell-fantasy/22602",
    # Final batch of players
    "Chase Brown": "https://fantasydata.com/nfl/chase-brown-fantasy/24374",
    "Chuba Hubbard": "https://fantasydata.com/nfl/chuba-hubbard-fantasy/21691",
    "David Montgomery": "https://fantasydata.com/nfl/david-montgomery-fantasy/20882",
    "De'Von Achane": "https://fantasydata.com/nfl/devon-achane-fantasy/24179",
    "Devin Singletary": "https://fantasydata.com/nfl/devin-singletary-fantasy/20941",
    "Ezekiel Elliott": "https://fantasydata.com/nfl/ezekiel-elliott-fantasy/17923",
    "Isiah Pacheco": "https://fantasydata.com/nfl/isiah-pacheco-fantasy/23371",
    "J.K. Dobbins": "https://fantasydata.com/nfl/j-k-dobbins-fantasy/21674",
    "Joe Mixon": "https://fantasydata.com/nfl/joe-mixon-fantasy/18858",
    "Kyren Williams": "https://fantasydata.com/nfl/kyren-williams-fantasy/23212",
    "MarShawn Lloyd": "https://fantasydata.com/nfl/marshawn-lloyd-fantasy/23211",
    "Jaylen Wright": "https://fantasydata.com/nfl/jaylen-wright-fantasy/24923",
    "Keaton Mitchell": "https://fantasydata.com/nfl/keaton-mitchell-fantasy/24214",
    "Dylan Sampson": "https://fantasydata.com/nfl/dylan-sampson-fantasy/25889",
    "Chris Godwin": "https://fantasydata.com/nfl/chris-godwin-fantasy/18880",
    "Christian Kirk": "https://fantasydata.com/nfl/christian-kirk-fantasy/19815",
    "Christian Watson": "https://fantasydata.com/nfl/christian-watson-fantasy/23395",
    "Cedric Tillman": "https://fantasydata.com/nfl/cedric-tillman-fantasy/24348",
    "Cole Kmet": "https://fantasydata.com/nfl/cole-kmet-fantasy/21772",
    "Darnell Mooney": "https://fantasydata.com/nfl/darnell-mooney-fantasy/21961",
    "DeVonta Smith": "https://fantasydata.com/nfl/devonta-smith-fantasy/21687",
    "DJ Moore": "https://fantasydata.com/nfl/dj-moore-fantasy/19844",
    "Demario Douglas": "https://fantasydata.com/nfl/demario-douglas-fantasy/24180",
    "Elijah Moore": "https://fantasydata.com/nfl/elijah-moore-fantasy/22592",
    "Gabe Davis": "https://fantasydata.com/nfl/gabriel-davis-fantasy/21735",
    "Hollywood Brown": "https://fantasydata.com/nfl/marquise-brown-fantasy/21045",
    "Jakobi Meyers": "https://fantasydata.com/nfl/jakobi-meyers-fantasy/20876",
    "Jerry Jeudy": "https://fantasydata.com/nfl/jerry-jeudy-fantasy/21692",
    "Michael Pittman Jr.": "https://fantasydata.com/nfl/michael-pittman-jr-fantasy/21744",
    "Dallas Goedert": "https://fantasydata.com/nfl/dallas-goedert-fantasy/19863",
    "Mark Andrews": "https://fantasydata.com/nfl/mark-andrews-fantasy/19803",
    "Harrison Butker": "https://fantasydata.com/nfl/harrison-butker-fantasy/19073",
    "Justin Tucker": "https://fantasydata.com/nfl/justin-tucker-fantasy/14688",
    "Kansas City Chiefs": "https://fantasydata.com/nfl/kansas-city-chiefs-roster",
    "Christian McCaffrey": "https://fantasydata.com/nfl/christian-mccaffrey-fantasy/18877",
    "Derrick Henry": "https://fantasydata.com/nfl/derrick-henry-fantasy/17959",
    "Jahmyr Gibbs": "https://fantasydata.com/nfl/jahmyr-gibbs-fantasy/23200",
    "James Conner": "https://fantasydata.com/nfl/james-conner-fantasy/18983",
    "Saquon Barkley": "https://fantasydata.com/nfl/saquon-barkley-fantasy/19766",
    "Ja'Marr Chase": "https://fantasydata.com/nfl/ja-marr-chase-fantasy/22564",
    "Lamar Jackson": "https://fantasydata.com/nfl/lamar-jackson-fantasy/19781",
    "Josh Allen": "https://fantasydata.com/nfl/josh-allen-fantasy/19801",
    "Elijah Mitchell": "https://fantasydata.com/nfl/eli-mitchell-fantasy/22535",
    "Jordan Mason": "https://fantasydata.com/nfl/jordan-mason-fantasy/23364",
    "Deebo Samuel Sr.": "https://fantasydata.com/nfl/deebo-samuel-sr-fantasy/20932",
    "Deebo Samuel": "https://fantasydata.com/nfl/deebo-samuel-sr-fantasy/20932",
    # More tight ends and kickers
    "Evan Engram": "https://fantasydata.com/nfl/evan-engram-fantasy/18912",
    "Isaiah Likely": "https://fantasydata.com/nfl/isaiah-likely-fantasy/23256",
    "Kyle Pitts": "https://fantasydata.com/nfl/kyle-pitts-fantasy/22508",
    "Jake Ferguson": "https://fantasydata.com/nfl/jake-ferguson-fantasy/23138",
    "Ka'imi Fairbairn": "https://fantasydata.com/nfl/ka-imi-fairbairn-fantasy/18215",
    "Jake Elliott": "https://fantasydata.com/nfl/jake-elliott-fantasy/19041",
    # More teams
    "Houston Texans": "https://fantasydata.com/nfl/houston-texans-roster",
    "Miami Dolphins": "https://fantasydata.com/nfl/miami-dolphins-roster",
    # More wide receivers
    "Keon Coleman": "https://fantasydata.com/nfl/keon-coleman-fantasy/24964"
}

def load_players_data():
    with open('data/players.json', 'r') as f:
        return json.load(f)

def save_players_data(data):
    with open('data/players.json', 'w') as f:
        json.dump(data, f, indent=2)

def extract_player_name_from_url(url):
    if 'search?q=' in url:
        import re
        match = re.search(r'search\?q=(.+)$', url)
        if match:
            return unquote(match.group(1))
    return None

def update_player_urls(players, mapping):
    updates_made = 0
    for player in players:
        if 'fantasyDataUrl' in player and 'search?q=' in player['fantasyDataUrl']:
            search_name = extract_player_name_from_url(player['fantasyDataUrl'])
            if search_name and search_name in mapping:
                player['fantasyDataUrl'] = mapping[search_name]
                updates_made += 1
                print(f"Updated {player['name']}: {mapping[search_name]}")
    return updates_made

def main():
    print("Loading player data...")
    players = load_players_data()
    
    print(f"Updating URLs for {len(player_url_mapping)} players...")
    updates = update_player_urls(players, player_url_mapping)
    
    if updates > 0:
        save_players_data(players)
        print(f"\nSuccessfully updated {updates} player URLs")
    else:
        print("\nNo updates were made")
    
    # Count remaining search URLs
    remaining = 0
    for player in players:
        if 'fantasyDataUrl' in player and 'search?q=' in player['fantasyDataUrl']:
            remaining += 1
    
    print(f"Remaining players with search URLs: {remaining}")

if __name__ == "__main__":
    main()