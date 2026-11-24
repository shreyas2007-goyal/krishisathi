import {SafeAreaView, View,Text, TouchableOpacity, StyleSheet,Image} from "react-native"

export default function DiagnosisScreen (){
    return(
        <SafeAreaView style={Styles.container}>
           <TouchableOpacity style={Styles.photoButton}>
                <Image source={require('../assets/gallery.png')} style={Styles.gallery}/>
                <Text style={Styles.galleryText}>Add Photo</Text>
           </TouchableOpacity>
           <TouchableOpacity style={Styles.snapButton}>
                    <Image source={require('../assets/camera.png')} style={Styles.gallery}/>
                    <Text style={Styles.galleryText}>Snap Photo</Text>
           </TouchableOpacity>
        </SafeAreaView>
    )
};
const Styles = StyleSheet.create({
    container:{
        flex:1,
        flexDirection:'row'
    },
    photoButton:{
        margin:10,
        backgroundColor:'#A69CE5',
        width:'45%',
        height:'30%',
        borderRadius:20,
        flexDirection:'column',
        alignItems:'center',
        justifyContent:'center'
    },
    snapButton:{
         margin:10,
        backgroundColor:'#5992FF',
        width:'45%',
        height:'30%',
        borderRadius:20,
          flexDirection:'column',
        alignItems:'center',
        justifyContent:'center'
    },
    gallery:{
        width:50,
        height:50
    },
    galleryText:{
        marginTop:20,
        fontSize:20
    }
})