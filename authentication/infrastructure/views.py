from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from ..application.use_cases import LoginUseCase, ValidateTokenUseCase, ChangePasswordUseCase
from ..application.dtos import LoginRequest, ChangePasswordRequest
from .repository_impl import DjangoUsuarioRepository
from shared.infrastructure.logging_impl import get_logger
logger = get_logger(__name__)


def get_usuario_repository():
    return DjangoUsuarioRepository()


@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login_view(request):
    repository = get_usuario_repository()
    
    try:
        request_dto = LoginRequest(
            username=request.data.get('username', ''),
            password=request.data.get('password', '')
        )
        
        use_case = LoginUseCase(repository)
        response = use_case.execute(request_dto)
        
        if response.success:
            return Response({
                'success': True,
                'token': response.token,
                'usuario': response.usuario,
                'message': response.message
            })
        else:
            return Response({
                'success': False,
                'message': response.message
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        logger.error(f"Error al iniciar sesión: {str(e)}")
        return Response({
            'success': False,
            'message': 'Error interno del servidor'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def validate_token_view(request):
    repository = get_usuario_repository()
    
    token = request.data.get('token', '')
    if not token:
        logger.warning("Token requerido")
        return Response({
            'valid': False,
            'message': 'Token requerido'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    use_case = ValidateTokenUseCase(repository)
    usuario = use_case.execute(token)
    
    if usuario:
        return Response({
            'valid': True,
            'usuario': {
                'id': usuario.id,
                'username': usuario.username,
                'email': usuario.email,
                'nombre_completo': usuario.nombre_completo,
                'codigo_vendedor_profit': usuario.codigo_vendedor_profit
            }
        })
    else:
        return Response({
            'valid': False,
            'message': 'Token inválido o expirado'
        }, status=status.HTTP_401_UNAUTHORIZED)


@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def logout_view(request):
    # En un sistema JWT stateless, el logout se maneja en el cliente
    # eliminando el token del almacenamiento local
    return Response({
        'success': True,
        'message': 'Logout exitoso'
    })


@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def change_password_view(request):
    """
    Cambia la contraseña del usuario autenticado usando JWT en Authorization header.
    Body: { old_password, new_password }
    """
    repository = get_usuario_repository()

    # Obtener token del header Authorization: Bearer <token>
    auth_header = request.headers.get('Authorization', '')
    token = ''
    if auth_header.startswith('Bearer '):
        token = auth_header.split(' ', 1)[1]

    if not token:
        return Response({'success': False, 'message': 'No autorizado'}, status=status.HTTP_401_UNAUTHORIZED)

    # Validar token y obtener usuario
    validate_uc = ValidateTokenUseCase(repository)
    usuario = validate_uc.execute(token)
    if not usuario:
        return Response({'success': False, 'message': 'Token inválido o expirado'}, status=status.HTTP_401_UNAUTHORIZED)

    old_password = request.data.get('old_password', '')
    new_password = request.data.get('new_password', '')

    use_case = ChangePasswordUseCase(repository)
    result = use_case.execute(ChangePasswordRequest(user_id=usuario.id, old_password=old_password, new_password=new_password))

    status_code = status.HTTP_200_OK if result.success else status.HTTP_400_BAD_REQUEST
    return Response({'success': result.success, 'message': result.message}, status=status_code)