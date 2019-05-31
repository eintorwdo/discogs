const request = require('request'); //modul ktory bedzie wykonywal zapytania
const readlineSync = require('readline-sync');  //node z natury jest asynchroniczny, a ten modul pozwoli latwo wczytywac synchronicznie wejscie z klawiatury

// var rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//     terminal: true
// });

var artist = 'Budka Suflera'; //domyslna wartosc

if(process.argv[2]){
        artist = process.argv[2];   //nazwa zespolu
}

var replaced = artist.replace(/ /g, '+');    //usuwamy spacje z nazwy zespolu
var url = `https://api.discogs.com/database/search?q=${replaced}&type=artist&key=cPkcpBDMqvoeXINjbDvW&secret=lNXTbHkWuJtyJUQpdqGyGIHHlODZKLSm`;

function filterGroup(group){    //funkcja filtrujaca informacje o zespolach
        var filteredGroup = {id: group.id, name: group.name};   //zostaja tylko inf. o id zespolu i jego nazwie
        return filteredGroup;
}


var memberRepeat = 0;
var bandRepeat = 0;

function memberRequest(id, name){   //funkcja pobierajaca informacje o konkretnych czlonkach zespolu
        return new Promise(function (resolve, reject){
                    console.log(`Pobieram informacje nt. członka ${name}...`);
                    request({url: `https://api.discogs.com/artists/${id}`, headers: {'User-Agent':'test/0.1'}}, (err, res, body) => {
                        if(!err && res.statusCode == 200){
                                var arr = JSON.parse(body);
                                var groups = arr.groups;
                                var filteredGroups = groups.map(filterGroup);   //dla kazdego zespolu z tablicy groups wykonywana funkcja filterGroup
                                resolve(filteredGroups);
                        }
                        else if(res.statusCode == 429){ //jesli w odpowiedzi otrzymamy kod too many requests
                            memberRepeat++;
                            var timeout = 10000;
                            if(memberRepeat > 1){   //przy ponowym bledzie 429 wydluzamy czas oczekiwania
                                timeout = memberRepeat * 10000;
                            }
                            var seconds = timeout/1000;
                            console.log(`Zbyt wiele zapytań, czekam ${seconds} sekund...`);
                            setTimeout(function(){resolve(memberRequest(id, name))}, timeout);    //czekamy i powtarzamy zapytanie
                        }
                        else{
                            reject(res.statusCode);
                        }
                })
        })
}


function groupRequest(groupID, name){
    console.log(`Pobieram informacje nt. zespołu ${name}...`);
    request({url: `https://api.discogs.com/artists/${groupID}`, headers: {'User-Agent':'test/0.1'}}, async function(error,res,bod){ //zapytanie o dane zespolu o konkretnym id
        if(!error && res.statusCode == 200){
            var arr = JSON.parse(bod);
            var members = arr.members;  //tablica z danymi o czlonkach zespolu
            if(!members){
                return console.log('Nie znaleziono zespołu');
            }
            var groupSet = new Set();   //zbior wszystkich zespolow do ktorych nalezeli czlonkowie
            for(member of members){
                    try{
                            memberRepeat = 0;
                            var groups = await memberRequest(member.id, member.name);   //zapytanie o dane kazdego czlonka zespolu
                            member.groups = groups.map((group) => { //w obiekcie kazdego czlonka zapisujemy id wszystkich zespolow w jakich gral
                                return group.id;
                            });
                    }catch(e){
                            console.log(`${e}: Blad w trakcie memberRequest`);
                            return e;
                    }
                    groups.forEach((group) => {
                            if(!groupSet.has(JSON.stringify(group))){   //niestety w js porownywanie obiektow jest slabe (obiekty sa rowne sobie jesli maja ta sama referencje)
                                groupSet.add(JSON.stringify(group));    //dlatego obiekty konwertujemy do JSON-owych stringow
                            }
                    })
            }

            var groupArrJSON = Array.from(groupSet);    //nastepnie konwertujemy zbior zespolow z powrotem do tablicy js-owych obiektow
            var groupArr = groupArrJSON.map((groupJSON) => {
                return JSON.parse(groupJSON);
            })

            for(group of groupArr){ //zbior wszystkich zespolow
                group.members = []; //dla kazdego zespolu tworzymy nowe pole, czyli tablice zawierajaca wystepujacych tam muzykow
                for(member of members){
                    if(member.groups.includes(group.id)){   //jesli czlonek wystepowal w danym zespole,
                        group.members.push(member);         //to jest wstawiany na liste czlonkow danego zespolu
                    }
                }
            }

            console.log('');
            console.log('Inne zespoły, w których grało przynajmniej dwóch członków wyszukiwanego zespołu:')
            console.log('');
            for(group of groupArr){
                if(group.members.length > 1 && group.id != groupID){    //interesuja nas tylko grupy w ktorych przynajmniej 2 czlonkow wyszukiwanego zespolu gralo razem i odrzucamy zespol podany jako argument programu
                    console.log(`${group.name}:`);
                    for(member of group.members){
                        console.log(member.name);
                    }
                    console.log('');
                }
            }
        }
        else if(res.statusCode == 429){
            bandRepeat++;
            var timeout = 10000;
            if(memberRepeat > 1){   //przy ponowym bledzie 429 wydluzamy czas oczekiwania
                timeout = bandRepeat * 10000;
            }
            var seconds = timeout/1000;
            console.log(`Zbyt wiele zapytań, czekam ${seconds} sekund...`);
            setTimeout(function(){groupRequest(groupID, name)}, timeout);
        }
        else{
            console.log(`Błąd w trakcie wyszukiwania informacji nt. zespołu: ${res.statusCode}`);
            return error;
        }
    });
}


console.log('');
console.log('Wyszukuję id zespołu...');
request({url, headers: {'User-Agent':'test/0.1'}}, function(error,response,body){   //wyszukujemy id zespolu o podanej nazwie
    if(!error && response.statusCode == 200){
            if(JSON.parse(body).results.length == 0){
                    return console.log("Nie znaleziono zespolu, wpisz poprawna nazwe");
            }
            var results = JSON.parse(body).results;
            if(results[0].title.toUpperCase() != artist.toUpperCase()){ //jesli nazwa znalezionego zespolu nie pokrywa sie z nazwa podana przy uruchamianiu to program wyswietli liste zespolow do wyboru
                console.log('');                                        //(zdarzalo sie, ze podalem np. nazwe zespolu Creed, a wyszukiwalo osobe o takim imieniu, czy nazwisku)
                console.log('Który zespół wybrać?');
                for(i=0;i<5;i++){
                    console.log(`${i+1}. ${results[i].title}`);
                }
                console.log('');
                
                function readNum(){ //funkcja do wczytywania liczby z klawiatury
                     var num = parseInt(readlineSync.question('Podaj numer: '));
                     return num;
                }

                var num = readNum();
                while(!(num > 0 && num < 6)){   //wyswietlamy liste 5 zespolow i liczby w takim zakresie oczekujemy
                    num = readNum();
                }
                var groupID = results[num-1].id;
                var name = results[num-1].title;
            }
            else{   //w przeciwnym wypadku wybieramy pierwszy wynik wyszukiwania
                var groupID = results[0].id;
                var name = results[0].title;
            }
            groupRequest(groupID, name);
    }
    else{
        console.log(`Błąd w trakcie wyszukiwania id zespołu: ${response.statusCode}`);
        return error;
    }
});
